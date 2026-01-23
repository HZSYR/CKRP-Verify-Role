import { MongoClient } from 'mongodb';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

function parseUserAgent(ua) {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
    else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

    return { browser, os, device };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { type, guildId, duplicateAccounts } = req.body;

        // Get client info
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         req.headers['x-real-ip'] ||
                         'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const { browser, os, device } = parseUserAgent(userAgent);
        const language = req.headers['accept-language']?.split(',')[0] || 'Unknown';

        const client = await connectToDatabase();
        const db = client.db();
        const collection = db.collection('suspicious_logs');

        // Create log entry
        const logEntry = {
            type: type, // 'vpn' or 'duplicate_ip'
            ip: clientIP,
            userAgent: userAgent,
            browser: browser,
            os: os,
            device: device,
            language: language,
            guildId: guildId || null,
            duplicateAccounts: duplicateAccounts || [],
            processed: false,
            createdAt: new Date()
        };

        await collection.insertOne(logEntry);

        return res.status(200).json({ success: true, logged: true });

    } catch (error) {
        console.error('Log Suspicious Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
