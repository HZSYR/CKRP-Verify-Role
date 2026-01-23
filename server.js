require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'ckrp-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 600000 }
}));

// MongoDB Schema
const verificationSchema = new mongoose.Schema({
    odiscordId: { type: String, required: true },
    odiscordUsername: String,
    odiscordAvatar: String,
    odiscordGlobalName: String,
    email: String,
    ip: String,
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    platform: String,
    language: String,
    timezone: String,
    screenResolution: String,
    guildId: String,
    processed: { type: Boolean, default: false },
    qualified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Verification = mongoose.model('Verification', verificationSchema);

// Get real IP
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] ||
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip ||
           'Unknown';
}

// Parse User Agent
function parseUserAgent(ua) {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Detect Browser
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';
    else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

    // Detect OS
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Detect Device
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
    else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

    return { browser, os, device };
}

// Routes
app.get('/', (req, res) => {
    const guildId = req.query.guild;
    if (guildId) {
        req.session.guildId = guildId;
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Discord OAuth2 Login
app.get('/auth/discord', (req, res) => {
    const guildId = req.query.guild || req.session.guildId;
    if (guildId) {
        req.session.guildId = guildId;
    }
    
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    res.redirect(authUrl);
});

// Discord OAuth2 Callback
app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Exchange code for token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token } = tokenResponse.data;

        // Get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const user = userResponse.data;
        const clientIP = getClientIP(req);
        const guildId = req.session.guildId;

        if (!guildId) {
            return res.redirect('/?error=no_guild');
        }

        // Check if already verified
        const existingVerification = await Verification.findOne({
            odiscordId: user.id,
            guildId: guildId
        });

        if (existingVerification) {
            return res.redirect('/?status=already_verified');
        }

        // Parse user agent for browser/OS/device info
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const { browser, os, device } = parseUserAgent(userAgent);
        const language = req.headers['accept-language']?.split(',')[0] || 'Unknown';

        // Save to MongoDB
        const verification = new Verification({
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
            platform: req.headers['sec-ch-ua-platform']?.replace(/"/g, '') || os,
            language: language,
            guildId: guildId,
            processed: false
        });

        await verification.save();

        console.log(`New verification: ${user.username} (${user.id}) - IP: ${clientIP} - Browser: ${browser} - OS: ${os}`);

        res.redirect('/?status=success');

    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.redirect('/?error=oauth_failed');
    }
});

// API endpoint to check status
app.get('/api/status', (req, res) => {
    res.json({ status: 'online' });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Terhubung ke MongoDB!');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server berjalan di http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error koneksi MongoDB:', err);
    });
