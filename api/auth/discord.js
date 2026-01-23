export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    
    // Get guild from query
    const guildId = req.query.guild;
    
    // Use state parameter to pass guild ID (more reliable than cookies)
    const state = guildId ? Buffer.from(JSON.stringify({ guildId })).toString('base64') : '';
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
    
    res.redirect(307, authUrl);
}
