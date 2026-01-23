import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(screenshot, {
            folder: 'ckrp-screenshots',
            public_id: `screenshot_${logId}_${Date.now()}`,
            resource_type: 'image'
        });

        const screenshotUrl = uploadResult.secure_url;

        // Update MongoDB with screenshot URL
        const client = await connectToDatabase();
        const db = client.db();
        const collection = db.collection('suspicious_logs');

        const { ObjectId } = await import('mongodb');
        await collection.updateOne(
            { _id: new ObjectId(logId) },
            { $set: { screenshotUrl: screenshotUrl } }
        );

        return res.status(200).json({ success: true, url: screenshotUrl });

    } catch (error) {
        console.error('Upload Cloudinary Error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
}
