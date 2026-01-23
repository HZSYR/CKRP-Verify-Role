export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
        // Get client IP
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         req.headers['x-real-ip'] ||
                         'Unknown';

        if (clientIP === 'Unknown' || clientIP === '127.0.0.1' || clientIP === '::1') {
            return res.status(200).json({ isVPN: false, ip: clientIP });
        }

        // Use ip-api.com for VPN/Proxy detection (free, no API key needed)
        const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,proxy,hosting`);
        const data = await response.json();

        // Check if IP is proxy/VPN or hosting/datacenter
        const isVPN = data.proxy === true || data.hosting === true;

        return res.status(200).json({
            isVPN: isVPN,
            ip: clientIP,
            proxy: data.proxy || false,
            hosting: data.hosting || false
        });

    } catch (error) {
        console.error('VPN Check Error:', error);
        // If check fails, allow access (fail-open)
        return res.status(200).json({ isVPN: false, error: 'Check failed' });
    }
}
