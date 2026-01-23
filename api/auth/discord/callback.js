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

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress ||
           'Unknown';
}

export default async function handler(req, res) {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Exchange code for token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            return res.redirect('/?error=oauth_failed');
        }

        // Get user info
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const user = await userRes.json();

        // Get guild from cookie
        const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
            const [key, val] = c.trim().split('=');
            acc[key] = val;
            return acc;
        }, {}) || {};
        
        const guildId = cookies.guildId;
        if (!guildId) {
            return res.redirect('/?error=no_guild');
        }

        // Connect to MongoDB
        const client = await connectToDatabase();
        const db = client.db('ckrp-takerole');
        const collection = db.collection('verifications');

        // Check if already verified
        const existing = await collection.findOne({ odiscordId: user.id, guildId: guildId });
        if (existing) {
            return res.redirect('/?status=already_verified');
        }

        // Parse user agent
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const { browser, os, device } = parseUserAgent(userAgent);
        const clientIP = getClientIP(req);
        const language = req.headers['accept-language']?.split(',')[0] || 'Unknown';

        // Save to MongoDB
        await collection.insertOne({
            odiscordId: user.id,
            odiscordUsername: user.username,
            odiscordAvatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
            odiscordGlobalName: user.global_name || user.username,
            email: user.email,
            ip: clientIP,
            userAgent: userAgent,
            browser: browser,
            os: os,
            device: device,
            platform: os,
            language: language,
            guildId: guildId,
            processed: false,
            qualified: false,
            createdAt: new Date()
        });

        // Clear guild cookie
        res.setHeader('Set-Cookie', 'guildId=; Path=/; HttpOnly; Max-Age=0');
        res.redirect('/?status=success');

    } catch (error) {
        console.error('OAuth Error:', error.message);
        console.error('Stack:', error.stack);
        res.redirect('/?error=oauth_failed&msg=' + encodeURIComponent(error.message));
    }
}
