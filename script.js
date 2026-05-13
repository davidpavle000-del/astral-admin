// Configuration
const ADMIN_PASSWORD = 'Idkyo123@'; // Change this to your secure password
const GIST_ID = 'ce31429a2f55e004da6a538b73346e4c';
const GITHUB_TOKEN = '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'; // You need to create a GitHub Personal Access Token

// Data storage
let keysData = {
    keys: []
};

let currentEditKey = null;

// Particle System
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * -this.canvas.height;
        this.speed = 1.5 + Math.random() * 2.5;
        this.size = 1 + Math.random() * 3;
        this.opacity = 0.4 + Math.random() * 0.6;
        this.vx = 0;
        this.vy = this.speed;
    }
    
    update(mouseX, mouseY) {
        // Mouse repulsion
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 100;
        
        if (distance < minDistance) {
            const force = (minDistance - distance) / minDistance;
            this.vx += (dx / distance) * force * 2;
            this.vy += (dy / distance) * force * 2;
        }
        
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;
        
        // Damping
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        // Gravity (always falling)
        this.vy += 0.08;
        
        // Reset if out of bounds
        if (this.y > this.canvas.height + 10) {
            this.reset();
        }
        if (this.x < -10 || this.x > this.canvas.width + 10) {
            this.x = Math.random() * this.canvas.width;
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

let particles = [];
let canvas, ctx;
let mouseX = -1000, mouseY = -1000;

function initParticles() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create particles
    const particleCount = 200;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas));
    }
    
    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update(mouseX, mouseY);
            particle.draw(ctx);
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particles
    initParticles();
    
    // Check if already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }
});

// Login
function login() {
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        errorElement.textContent = '';
        showDashboard();
    } else {
        errorElement.textContent = 'Invalid password';
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('adminPassword').value = '';
}

// Show Dashboard
async function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    await loadKeys();
}

// Load keys from GitHub Gist
async function loadKeys() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        const gist = await response.json();
        
        // Get the first file in the gist
        const fileName = Object.keys(gist.files)[0];
        const content = gist.files[fileName].content;
        
        keysData = JSON.parse(content);
        
        updateStatistics();
        renderKeysTable();
    } catch (error) {
        console.error('Error loading keys:', error);
        alert('Failed to load keys from GitHub Gist. Check console for details.');
    }
}

// Save keys to GitHub Gist
async function saveKeys() {
    if (!GITHUB_TOKEN || GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN_HERE') {
        alert('Please set your GitHub Personal Access Token in script.js');
        return false;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                files: {
                    'keys.json': {
                        content: JSON.stringify(keysData, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`Failed to update gist: ${response.status} ${errorData.message || ''}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving keys:', error);
        alert('Failed to save keys to GitHub Gist. Check console for details.');
        return false;
    }
}

// Update statistics
function updateStatistics() {
    const total = keysData.keys.length;
    const active = keysData.keys.filter(k => k.enabled).length;
    const disabled = total - active;
    const users = new Set(keysData.keys.filter(k => k.user).map(k => k.user)).size;
    
    document.getElementById('totalKeys').textContent = total;
    document.getElementById('activeKeys').textContent = active;
    document.getElementById('disabledKeys').textContent = disabled;
    document.getElementById('totalUsers').textContent = users;
}

// Render keys table
function renderKeysTable(filteredKeys = null) {
    const tbody = document.getElementById('keysTableBody');
    const keys = filteredKeys || keysData.keys;
    
    tbody.innerHTML = '';
    
    keys.forEach(keyData => {
        const tr = document.createElement('tr');
        
        const status = getKeyStatus(keyData);
        const statusClass = status === 'Enabled' ? 'status-enabled' : 
                           status === 'Disabled' ? 'status-disabled' : 'status-expired';
        
        tr.innerHTML = `
            <td><code>${keyData.key}</code></td>
            <td>${keyData.user || '-'}</td>
            <td><code>${keyData.hwid ? keyData.hwid.substring(0, 12) + '...' : '-'}</code></td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>${formatDate(keyData.createdAt)}</td>
            <td>${keyData.expiresAt ? formatDate(keyData.expiresAt) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-warning" onclick="editKey('${keyData.key}')">Edit</button>
                    <button class="btn ${keyData.enabled ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleKey('${keyData.key}')">
                        ${keyData.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn btn-secondary" onclick="resetHWID('${keyData.key}')">Reset HWID</button>
                    <button class="btn btn-danger" onclick="deleteKey('${keyData.key}')">Delete</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Get key status
function getKeyStatus(keyData) {
    if (!keyData.enabled) return 'Disabled';
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) return 'Expired';
    return 'Enabled';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Generate random key
function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    const segments = 5;
    const segmentLength = 6;
    let key = 'Astral';
    
    for (let i = 0; i < segments; i++) {
        key += '-';
        for (let j = 0; j < segmentLength; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return key;
}

// Show generate modal
function showGenerateModal() {
    document.getElementById('generateModal').classList.add('active');
    document.getElementById('generatedKeys').innerHTML = '';
}

// Close generate modal
function closeGenerateModal() {
    document.getElementById('generateModal').classList.remove('active');
}

// Generate keys
async function generateKeys() {
    const keyType = document.getElementById('keyType').value;
    const keyCount = parseInt(document.getElementById('keyCount').value);
    
    if (keyCount < 1 || keyCount > 100) {
        alert('Please enter a number between 1 and 100');
        return;
    }
    
    const generatedKeysDiv = document.getElementById('generatedKeys');
    generatedKeysDiv.innerHTML = '<p style="color: #888; margin-bottom: 10px;">Generating keys...</p>';
    
    const newKeys = [];
    
    for (let i = 0; i < keyCount; i++) {
        const key = generateRandomKey();
        const expiresAt = calculateExpiry(keyType);
        
        const keyData = {
            key: key,
            enabled: true,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt,
            user: null,
            hwid: null
        };
        
        keysData.keys.push(keyData);
        newKeys.push(key);
    }
    
    const saved = await saveKeys();
    
    if (saved) {
        generatedKeysDiv.innerHTML = '<h3 style="color: #28a745; margin-bottom: 15px;">✓ Keys Generated Successfully!</h3>';
        
        newKeys.forEach(key => {
            const keyItem = document.createElement('div');
            keyItem.className = 'generated-key-item';
            keyItem.innerHTML = `
                <span>${key}</span>
                <button class="copy-btn" onclick="copyToClipboard('${key}')">Copy</button>
            `;
            generatedKeysDiv.appendChild(keyItem);
        });
        
        updateStatistics();
        renderKeysTable();
    }
}

// Calculate expiry date
function calculateExpiry(keyType) {
    if (keyType === 'lifetime') return null;
    
    const now = new Date();
    const days = {
        '1day': 1,
        '7days': 7,
        '30days': 30
    };
    
    now.setDate(now.getDate() + days[keyType]);
    return now.toISOString();
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Key copied to clipboard!');
    });
}

// Toggle key enabled/disabled
async function toggleKey(key) {
    const keyData = keysData.keys.find(k => k.key === key);
    if (keyData) {
        keyData.enabled = !keyData.enabled;
        const saved = await saveKeys();
        if (saved) {
            updateStatistics();
            renderKeysTable();
        }
    }
}

// Reset HWID
async function resetHWID(key) {
    if (!confirm('Are you sure you want to reset the HWID for this key?')) return;
    
    const keyData = keysData.keys.find(k => k.key === key);
    if (keyData) {
        keyData.hwid = null;
        const saved = await saveKeys();
        if (saved) {
            renderKeysTable();
            alert('HWID reset successfully!');
        }
    }
}

// Delete key
async function deleteKey(key) {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) return;
    
    keysData.keys = keysData.keys.filter(k => k.key !== key);
    const saved = await saveKeys();
    if (saved) {
        updateStatistics();
        renderKeysTable();
        alert('Key deleted successfully!');
    }
}

// Edit key
function editKey(key) {
    const keyData = keysData.keys.find(k => k.key === key);
    if (!keyData) return;
    
    currentEditKey = key;
    
    document.getElementById('editKey').value = keyData.key;
    document.getElementById('editUser').value = keyData.user || '';
    document.getElementById('editHWID').value = keyData.hwid || '';
    document.getElementById('editStatus').value = keyData.enabled.toString();
    
    if (keyData.expiresAt) {
        const date = new Date(keyData.expiresAt);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        document.getElementById('editExpiry').value = localDateTime;
    } else {
        document.getElementById('editExpiry').value = '';
    }
    
    document.getElementById('editModal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditKey = null;
}

// Save key edit
async function saveKeyEdit() {
    if (!currentEditKey) return;
    
    const keyData = keysData.keys.find(k => k.key === currentEditKey);
    if (!keyData) return;
    
    keyData.user = document.getElementById('editUser').value || null;
    keyData.hwid = document.getElementById('editHWID').value || null;
    keyData.enabled = document.getElementById('editStatus').value === 'true';
    
    const expiryValue = document.getElementById('editExpiry').value;
    keyData.expiresAt = expiryValue ? new Date(expiryValue).toISOString() : null;
    
    const saved = await saveKeys();
    if (saved) {
        updateStatistics();
        renderKeysTable();
        closeEditModal();
        alert('Key updated successfully!');
    }
}

// Filter keys
function filterKeys() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderKeysTable();
        return;
    }
    
    const filtered = keysData.keys.filter(keyData => {
        return keyData.key.toLowerCase().includes(searchTerm) ||
               (keyData.user && keyData.user.toLowerCase().includes(searchTerm)) ||
               (keyData.hwid && keyData.hwid.toLowerCase().includes(searchTerm));
    });
    
    renderKeysTable(filtered);
}

// Refresh keys
async function refreshKeys() {
    await loadKeys();
    alert('Keys refreshed successfully!');
}

// Export data
function exportData() {
    const dataStr = JSON.stringify(keysData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `astral-keys-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Handle Enter key on login
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('loginScreen').classList.contains('active')) {
        login();
    }
});
