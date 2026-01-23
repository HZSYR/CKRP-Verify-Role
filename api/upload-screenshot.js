import { MongoClient } from 'mongodb';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb'
        }
    }
};

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
        const { screenshot, logId } = req.body;

        if (!screenshot || !logId) {
            return res.status(400).json({ error: 'Missing screenshot or logId' });
        }

        const client = await connectToDatabase();
        const db = client.db();
        const collection = db.collection('suspicious_logs');

        // Update the log with screenshot
        await collection.updateOne(
            { _id: new (await import('mongodb')).ObjectId(logId) },
            { $set: { screenshot: screenshot } }
        );

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Upload Screenshot Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
