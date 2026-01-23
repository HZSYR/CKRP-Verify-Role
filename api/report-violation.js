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
        const { 
            type,
            screenshot,
            ip,
            userAgent,
            browser,
            os,
            device,
            language,
            guildId,
            duplicateAccounts,
            timestamp
        } = req.body;

        if (!screenshot || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const client = await connectToDatabase();
        const db = client.db();
        const collection = db.collection('violations');

        // Save violation report
        const violation = await collection.insertOne({
            type: type,
            screenshot: screenshot,
            ip: ip || 'Unknown',
            userAgent: userAgent || 'Unknown',
            browser: browser || 'Unknown',
            os: os || 'Unknown',
            device: device || 'Unknown',
            language: language || 'Unknown',
            guildId: guildId || null,
            duplicateAccounts: duplicateAccounts || [],
            processed: false,
            createdAt: new Date(timestamp) || new Date()
        });

        return res.status(200).json({ 
            success: true, 
            violationId: violation.insertedId.toString()
        });

    } catch (error) {
        console.error('Report Violation Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
