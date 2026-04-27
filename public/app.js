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
        const response = await fetch('/api/check-vpn');
        const data = await response.json();
        
        if (data.isVPN) {
            // Always show VPN overlay
            document.getElementById('vpn-overlay').classList.add('show');
            document.getElementById('verify-btn').style.pointerEvents = 'none';
            document.getElementById('verify-btn').style.opacity = '0.5';
            
            // Only log once per session (API also checks for duplicates)
            if (!sessionStorage.getItem('vpn_logged')) {
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
                
                // Capture and upload screenshot to Cloudinary
                if (logData.logId && !logData.duplicate) {
                    setTimeout(async () => {
                        const screenshot = await captureScreenshot();
                        if (screenshot) {
                            await fetch('/api/upload-cloudinary', {
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
        }
    } catch (err) {
        console.log('VPN check failed:', err);
    }
}

// Check IP for duplicate accounts
async function checkIP() {
    try {
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
            
            // Always show popup
            tracker.classList.add('show');
            
            // Only log once per session (API also checks for duplicates)
            if (!sessionStorage.getItem('ip_logged')) {
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
                
                // Capture and upload screenshot to Cloudinary after popup shows
                if (logData.logId && !logData.duplicate) {
                    setTimeout(async () => {
                        const screenshot = await captureScreenshot();
                        if (screenshot) {
                            await fetch('/api/upload-cloudinary', {
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
        }
    } catch (err) {
        console.log('IP check failed:', err);
    }
}

checkVPN();
checkIP();
