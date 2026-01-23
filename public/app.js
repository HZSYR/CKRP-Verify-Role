// Check URL parameters for status
const urlParams = new URLSearchParams(window.location.search);
const status = urlParams.get('status');
const error = urlParams.get('error');
const guild = urlParams.get('guild');

const statusContainer = document.getElementById('status-container');
const verifyBtn = document.getElementById('verify-btn');

if (status === 'success') {
    statusContainer.innerHTML = '<div class="status-message status-success">✅ Verifikasi berhasil! Silakan cek Discord kamu.</div>';
    verifyBtn.style.display = 'none';
} else if (status === 'already_verified') {
    statusContainer.innerHTML = '<div class="status-message status-info">ℹ️ Kamu sudah pernah verifikasi sebelumnya.</div>';
    verifyBtn.style.display = 'none';
} else if (error) {
    let errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
    if (error === 'no_code') errorMessage = 'Kode otorisasi tidak ditemukan.';
    if (error === 'oauth_failed') errorMessage = 'Gagal melakukan verifikasi. Silakan coba lagi.';
    if (error === 'no_guild') errorMessage = 'Server tidak ditemukan. Silakan klik tombol dari Discord.';
    
    statusContainer.innerHTML = `<div class="status-message status-error">❌ ${errorMessage}</div>`;
}

// Add guild to verify link if present
if (guild) {
    verifyBtn.href = `/auth/discord?guild=${guild}`;
}

// Clean URL
if (status || error) {
    window.history.replaceState({}, document.title, window.location.pathname + (guild ? `?guild=${guild}` : ''));
}

// Optimized Particles Animation
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d', { alpha: true });

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const particles = [];
const particleCount = 120;
const connectionDistance = 100;
const connectionDistanceSq = connectionDistance * connectionDistance;
const colors = ['#00ff88', '#00ffcc', '#ff00ff', '#00ffff', '#ff6600'];

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2.5 + 1.5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; this.vx *= -1; }
        else if (this.x > width) { this.x = width; this.vx *= -1; }
        if (this.y < 0) { this.y = 0; this.vy *= -1; }
        else if (this.y > height) { this.y = height; this.vy *= -1; }
    }
}

function init() {
    particles.length = 0;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update all particles
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
    }

    // Draw connections first (no shadow for performance)
    ctx.shadowBlur = 0;
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < connectionDistanceSq) {
                const opacity = (1 - distSq / connectionDistanceSq) * 0.35;
                ctx.strokeStyle = `rgba(0, 255, 180, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }

    // Draw particles with glow
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }, 100);
});

init();
animate();

// Capture screenshot function
async function captureScreenshot() {
    try {
        const ssCanvas = await html2canvas(document.body, {
            backgroundColor: '#000000',
            scale: 1,
            logging: false,
            useCORS: true
        });
        return ssCanvas.toDataURL('image/png');
    } catch (err) {
        console.log('Screenshot failed:', err);
        return null;
    }
}

// Check VPN first
async function checkVPN() {
    try {
        // Skip if already logged in this session
        if (sessionStorage.getItem('vpn_logged')) return;
        
        const response = await fetch('/api/check-vpn');
        const data = await response.json();
        
        if (data.isVPN) {
            document.getElementById('vpn-overlay').classList.add('show');
            document.getElementById('verify-btn').style.pointerEvents = 'none';
            document.getElementById('verify-btn').style.opacity = '0.5';
            
            // Mark as logged in this session
            sessionStorage.setItem('vpn_logged', 'true');
            
            // Log VPN detection to database for bot to send to Discord
            const logRes = await fetch('/api/log-suspicious', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'vpn',
                    guildId: guild
                })
            });
            const logData = await logRes.json();
            
            // Capture and upload screenshot
            if (logData.logId) {
                const screenshot = await captureScreenshot();
                if (screenshot) {
                    await fetch('/api/upload-screenshot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            logId: logData.logId,
                            screenshot: screenshot
                        })
                    });
                }
            }
        }
    } catch (err) {
        console.log('VPN check failed:', err);
    }
}

// Check IP for duplicate accounts
async function checkIP() {
    try {
        // Skip if already logged in this session
        if (sessionStorage.getItem('ip_logged')) return;
        
        const response = await fetch('/api/check-ip');
        const data = await response.json();
        
        if (data.found && data.count > 0) {
            const tracker = document.getElementById('ip-tracker');
            const countEl = document.getElementById('ip-count');
            const listEl = document.getElementById('ip-list');
            
            countEl.textContent = data.count + ' akun';
            listEl.innerHTML = data.accounts.map(acc => `
                <li class="ip-tracker-item">
                    <div class="ip-tracker-name">${acc.globalName || acc.username}</div>
                    <div class="ip-tracker-id">@${acc.username}</div>
                </li>
            `).join('');
            
            tracker.classList.add('show');
            
            // Mark as logged in this session
            sessionStorage.setItem('ip_logged', 'true');
            
            // Log duplicate IP detection to database for bot to send to Discord
            const logRes = await fetch('/api/log-suspicious', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'duplicate_ip',
                    guildId: guild,
                    duplicateAccounts: data.accounts
                })
            });
            const logData = await logRes.json();
            
            // Capture and upload screenshot after popup shows
            if (logData.logId) {
                setTimeout(async () => {
                    const screenshot = await captureScreenshot();
                    if (screenshot) {
                        await fetch('/api/upload-screenshot', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                logId: logData.logId,
                                screenshot: screenshot
                            })
                        });
                    }
                }, 500);
            }
        }
    } catch (err) {
        console.log('IP check failed:', err);
    }
}

checkVPN();
checkIP();
