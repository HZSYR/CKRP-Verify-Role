export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    
    // Get guild from query or cookie
    const guildId = req.query.guild;
    if (guildId) {
        res.setHeader('Set-Cookie', `guildId=${guildId}; Path=/; HttpOnly; Max-Age=600`);
    }
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    res.redirect(307, authUrl);
}
