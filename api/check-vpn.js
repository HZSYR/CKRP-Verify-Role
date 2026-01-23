export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
        // Get client IP
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         req.headers['x-real-ip'] ||
                         'Unknown';

        console.log('VPN Check - Client IP:', clientIP);

        if (clientIP === 'Unknown' || clientIP === '127.0.0.1' || clientIP === '::1') {
            return res.status(200).json({ isVPN: false, ip: clientIP });
        }

        // Use proxycheck.io for VPN/Proxy detection (free tier: 1000 queries/day)
        const response = await fetch(`https://proxycheck.io/v2/${clientIP}?vpn=1&asn=1`);
        const data = await response.json();

        console.log('VPN Check - API Response:', JSON.stringify(data));

        // Check if IP is VPN/Proxy
        const ipData = data[clientIP] || {};
        const isVPN = ipData.proxy === 'yes' || ipData.type === 'VPN' || ipData.type === 'Hosting';

        return res.status(200).json({
            isVPN: isVPN,
            ip: clientIP,
            type: ipData.type || 'Unknown',
            provider: ipData.provider || 'Unknown',
            country: ipData.country || 'Unknown'
        });

    } catch (error) {
        console.error('VPN Check Error:', error);
        // If check fails, allow access (fail-open) but log the error
        return res.status(200).json({ isVPN: false, error: error.message, ip: 'check-failed' });
    }
}
