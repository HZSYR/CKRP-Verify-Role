import { MongoClient } from 'mongodb';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
        const client = await connectToDatabase();
        const db = client.db();
        const collection = db.collection('verifications');

        // Get client IP
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         req.headers['x-real-ip'] ||
                         'Unknown';

        if (clientIP === 'Unknown') {
            return res.status(200).json({ found: false, accounts: [], count: 0 });
        }

        // Find all accounts with same IP
        const accounts = await collection.find({ ip: clientIP }).toArray();

        if (accounts.length > 0) {
            const accountList = accounts.map(acc => ({
                username: acc.odiscordUsername,
                globalName: acc.odiscordGlobalName,
                discordId: acc.odiscordId,
                verifiedAt: acc.createdAt
            }));

            return res.status(200).json({
                found: true,
                ip: clientIP,
                count: accounts.length,
                accounts: accountList
            });
        }

        return res.status(200).json({ found: false, accounts: [], count: 0 });

    } catch (error) {
        console.error('Check IP Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
