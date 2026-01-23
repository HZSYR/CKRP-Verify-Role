// ========== SECURITY PROTECTION ==========
(function(){
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable keyboard shortcuts for DevTools
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
        // Ctrl+U (view source)
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
        // Ctrl+S (save)
        if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); return false; }
    });

    // Detect DevTools open
    const _0x1a = function() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#ff0000;font-size:24px;font-family:sans-serif;text-align:center;padding:20px;">🚫 DevTools Terdeteksi!<br><br>Tutup DevTools untuk melanjutkan.</div>';
        }
    };
    setInterval(_0x1a, 1000);

    // Disable text selection
    document.addEventListener('selectstart', function(e) { e.preventDefault(); });

    // Disable drag
    document.addEventListener('dragstart', function(e) { e.preventDefault(); });

    // Console warning
    const _0x2b = new Image();
    Object.defineProperty(_0x2b, 'id', {
        get: function() {
            document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#ff0000;font-size:24px;font-family:sans-serif;text-align:center;padding:20px;">🚫 Console Terdeteksi!<br><br>Tutup Console untuk melanjutkan.</div>';
        }
    });
    setInterval(function() { console.log(_0x2b); console.clear(); }, 1000);

    // Protect against function tampering
    const _originalFetch = window.fetch;
    Object.freeze(window);
})();

// ========== MAIN APPLICATION ==========
(function(){
    const _0xp = new URLSearchParams(window.location.search);
    const _0xs = _0xp.get('status');
    const _0xe = _0xp.get('error');
    const _0xg = _0xp.get('guild');

    const _0xsc = document.getElementById('status-container');
    const _0xvb = document.getElementById('verify-btn');

    if (_0xs === 'success') {
        _0xsc.innerHTML = '<div class="status-message status-success">✅ Verifikasi berhasil! Silakan cek Discord kamu.</div>';
        _0xvb.style.display = 'none';
    } else if (_0xs === 'already_verified') {
        _0xsc.innerHTML = '<div class="status-message status-info">ℹ️ Kamu sudah pernah verifikasi sebelumnya.</div>';
        _0xvb.style.display = 'none';
    } else if (_0xe) {
        let _0xem = 'Terjadi kesalahan. Silakan coba lagi.';
        if (_0xe === 'no_code') _0xem = 'Kode otorisasi tidak ditemukan.';
        if (_0xe === 'oauth_failed') _0xem = 'Gagal melakukan verifikasi. Silakan coba lagi.';
        if (_0xe === 'no_guild') _0xem = 'Server tidak ditemukan. Silakan klik tombol dari Discord.';
        _0xsc.innerHTML = '<div class="status-message status-error">❌ ' + _0xem + '</div>';
    }

    if (_0xg) { _0xvb.href = '/auth/discord?guild=' + _0xg; }
    if (_0xs || _0xe) { window.history.replaceState({}, document.title, window.location.pathname + (_0xg ? '?guild=' + _0xg : '')); }

    // Particles
    const _0xc = document.getElementById('particles-canvas');
    const _0xctx = _0xc.getContext('2d', { alpha: true });
    let _0xw = _0xc.width = window.innerWidth;
    let _0xh = _0xc.height = window.innerHeight;
    const _0xpa = [];
    const _0xpc = 120;
    const _0xcd = 100;
    const _0xcds = _0xcd * _0xcd;
    const _0xcl = ['#00ff88', '#00ffcc', '#ff00ff', '#00ffff', '#ff6600'];

    class _0xP {
        constructor() {
            this.x = Math.random() * _0xw;
            this.y = Math.random() * _0xh;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.r = Math.random() * 2.5 + 1.5;
            this.c = _0xcl[Math.floor(Math.random() * _0xcl.length)];
        }
        u() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0) { this.x = 0; this.vx *= -1; }
            else if (this.x > _0xw) { this.x = _0xw; this.vx *= -1; }
            if (this.y < 0) { this.y = 0; this.vy *= -1; }
            else if (this.y > _0xh) { this.y = _0xh; this.vy *= -1; }
        }
    }

    function _0xi() { _0xpa.length = 0; for (let i = 0; i < _0xpc; i++) { _0xpa.push(new _0xP()); } }

    function _0xa() {
        _0xctx.clearRect(0, 0, _0xw, _0xh);
        for (let i = 0; i < _0xpa.length; i++) { _0xpa[i].u(); }
        _0xctx.shadowBlur = 0;
        for (let i = 0; i < _0xpa.length; i++) {
            const p1 = _0xpa[i];
            for (let j = i + 1; j < _0xpa.length; j++) {
                const p2 = _0xpa[j];
                const dx = p1.x - p2.x, dy = p1.y - p2.y;
                const ds = dx * dx + dy * dy;
                if (ds < _0xcds) {
                    const op = (1 - ds / _0xcds) * 0.35;
                    _0xctx.strokeStyle = 'rgba(0,255,180,' + op + ')';
                    _0xctx.lineWidth = 1;
                    _0xctx.beginPath();
                    _0xctx.moveTo(p1.x, p1.y);
                    _0xctx.lineTo(p2.x, p2.y);
                    _0xctx.stroke();
                }
            }
        }
        for (let i = 0; i < _0xpa.length; i++) {
            const p = _0xpa[i];
            _0xctx.beginPath();
            _0xctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            _0xctx.fillStyle = p.c;
            _0xctx.shadowBlur = 12;
            _0xctx.shadowColor = p.c;
            _0xctx.fill();
        }
        requestAnimationFrame(_0xa);
    }

    let _0xrt;
    window.addEventListener('resize', function() {
        clearTimeout(_0xrt);
        _0xrt = setTimeout(function() { _0xw = _0xc.width = window.innerWidth; _0xh = _0xc.height = window.innerHeight; }, 100);
    });

    _0xi(); _0xa();

    // Screenshot and report function
    async function _0xreport(type, dupAccounts) {
        try {
            if (typeof html2canvas === 'undefined') return;
            const canvas = await html2canvas(document.body, { 
                backgroundColor: '#000000',
                scale: 0.8,
                logging: false
            });
            const screenshot = canvas.toDataURL('image/jpeg', 0.7);
            const ua = navigator.userAgent;
            let br = 'Unknown', os = 'Unknown', dv = 'Desktop';
            if (ua.includes('Firefox/')) br = 'Firefox';
            else if (ua.includes('Edg/')) br = 'Edge';
            else if (ua.includes('Chrome/')) br = 'Chrome';
            else if (ua.includes('Safari/')) br = 'Safari';
            if (ua.includes('Windows')) os = 'Windows';
            else if (ua.includes('Mac')) os = 'macOS';
            else if (ua.includes('Linux')) os = 'Linux';
            else if (ua.includes('Android')) os = 'Android';
            else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
            if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) dv = 'Mobile';
            
            await fetch('/api/report-violation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    screenshot: screenshot,
                    ip: 'detected-server-side',
                    userAgent: ua,
                    browser: br,
                    os: os,
                    device: dv,
                    language: navigator.language,
                    guildId: _0xg,
                    duplicateAccounts: dupAccounts || [],
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) { console.log('Report failed'); }
    }

    // VPN Check with protection
    (async function _0xvpn() {
        try {
            const r = await fetch('/api/check-vpn');
            const d = await r.json();
            if (d.isVPN) {
                document.getElementById('vpn-overlay').classList.add('show');
                document.getElementById('verify-btn').style.pointerEvents = 'none';
                document.getElementById('verify-btn').style.opacity = '0.5';
                // Capture screenshot and report
                setTimeout(function() { _0xreport('vpn', []); }, 1000);
                // Re-check every 2 seconds to prevent bypass
                setInterval(async function() {
                    try {
                        const r2 = await fetch('/api/check-vpn');
                        const d2 = await r2.json();
                        if (d2.isVPN) {
                            document.getElementById('vpn-overlay').classList.add('show');
                            document.getElementById('verify-btn').style.pointerEvents = 'none';
                        }
                    } catch(e) {}
                }, 2000);
            }
        } catch (e) {
            // If VPN check fails, block access for safety
            document.getElementById('vpn-overlay').classList.add('show');
            document.getElementById('verify-btn').style.pointerEvents = 'none';
        }
    })();

    // IP Check
    (async function _0xip() {
        try {
            const r = await fetch('/api/check-ip');
            const d = await r.json();
            if (d.found && d.count > 0) {
                const t = document.getElementById('ip-tracker');
                const c = document.getElementById('ip-count');
                const l = document.getElementById('ip-list');
                c.textContent = d.count + ' akun';
                l.innerHTML = d.accounts.map(function(a) {
                    return '<li class="ip-tracker-item"><div class="ip-tracker-name">' + (a.globalName || a.username) + '</div><div class="ip-tracker-id">@' + a.username + '</div></li>';
                }).join('');
                t.classList.add('show');
                // Capture screenshot and report double akun
                setTimeout(function() { _0xreport('double_account', d.accounts); }, 1000);
            }
        } catch (e) {}
    })();
})();
