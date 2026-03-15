// ===== UPLOAD PAGE — FULL FLOW =====

const CATEGORY_EMOJI = {
    'waste-segregation': '♻️', 'food-outreach': '🍕', 'elder-support': '🧓',
    'disaster-response': '🚑', 'healthcare': '🏥', 'agriculture': '🌾', 'education': '📚'
};

// State
let selectedFiles = [];
let selectedCategory = '';
let uploads = JSON.parse(localStorage.getItem('rfsg_uploads') || '[]');
let totalPoints = parseInt(localStorage.getItem('rfsg_points') || '0');

// Init
updatePointsDisplay();
renderRecentUploads();

// ===== DROP ZONE =====
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');

browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => addFiles(e.target.files));

function addFiles(fileListObj) {
    for (const f of fileListObj) selectedFiles.push(f);
    renderFileList();
    checkReady();
}

function renderFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        dropZone.classList.remove('has-files');
        return;
    }
    dropZone.classList.add('has-files');
    const totalSize = selectedFiles.reduce((a, f) => a + f.size, 0);
    dropZone.querySelector('.drop-main').textContent = `${selectedFiles.length} file(s) selected`;
    dropZone.querySelector('.drop-sub').textContent = `${(totalSize / 1024 / 1024).toFixed(1)} MB total`;

    fileList.innerHTML = selectedFiles.map((f, i) => `
        <div class="file-item">
            <span class="file-name">${f.name}</span>
            <span class="file-size">${(f.size / 1024 / 1024).toFixed(1)} MB</span>
            <button class="file-remove" data-idx="${i}">&times;</button>
        </div>
    `).join('');

    fileList.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedFiles.splice(parseInt(btn.dataset.idx), 1);
            renderFileList();
            checkReady();
        });
    });
}

// ===== CATEGORY PILLS =====
document.getElementById('categoryPills').addEventListener('click', (e) => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
    pill.classList.add('selected');
    selectedCategory = pill.dataset.cat;
    checkReady();
});

// ===== PAYOUT =====
document.querySelectorAll('.payout-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.payout-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const val = opt.querySelector('input').value;
        document.getElementById('paidFields').style.display = val === 'paid' ? 'block' : 'none';
    });
});

// ===== READY CHECK =====
function checkReady() {
    const name = document.getElementById('datasetName').value.trim();
    const ready = selectedFiles.length > 0 && selectedCategory && name;
    document.getElementById('submitBtn').disabled = !ready;
}

document.getElementById('datasetName').addEventListener('input', checkReady);

// ===== SUBMIT =====
document.getElementById('submitBtn').addEventListener('click', async () => {
    const name = document.getElementById('datasetName').value.trim();
    if (!name || !selectedCategory || selectedFiles.length === 0) return;

    const btn = document.getElementById('submitBtn');
    const panel = document.getElementById('analysisPanel');
    const progress = document.getElementById('progressFill');
    const status = document.getElementById('analysisStatus');
    const results = document.getElementById('analysisResults');
    const liveBtn = document.getElementById('liveBtn');

    btn.disabled = true;
    btn.classList.add('uploading');
    btn.querySelector('span').textContent = 'Uploading...';
    panel.style.display = 'block';
    results.style.display = 'none';
    status.textContent = 'Uploading to NomadicML...';
    status.className = 'analysis-status';

    // Simulate upload + NomadicML analysis
    await animateProgress(progress, 0, 30, 1500);
    status.textContent = 'NomadicML analyzing your data...';
    await animateProgress(progress, 30, 70, 3000);
    status.textContent = 'Classifying for social good...';
    await animateProgress(progress, 70, 95, 2000);

    // Generate results
    const catLabel = selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const confidence = 85 + Math.floor(Math.random() * 15);
    const events = 1 + Math.floor(Math.random() * 4);
    const isFree = document.querySelector('input[name="payout"]:checked').value === 'free';
    const basePoints = 50;
    const verifiedBonus = confidence > 90 ? 100 : 50;
    const freeBonus = isFree ? 50 : 0;
    const earnedPoints = basePoints + verifiedBonus + freeBonus;

    await animateProgress(progress, 95, 100, 500);
    status.textContent = 'Analysis complete';
    status.classList.add('done');

    document.getElementById('resultCategory').textContent = `${CATEGORY_EMOJI[selectedCategory] || ''} ${catLabel}`;
    document.getElementById('resultConfidence').textContent = `${confidence}%`;
    document.getElementById('resultEvents').textContent = `${events} events detected`;
    document.getElementById('resultSummary').textContent = `NomadicML identified this as ${catLabel.toLowerCase()} data with ${confidence}% confidence. ${events} relevant event(s) detected for robotics training.`;
    document.getElementById('resultPoints').textContent = `+${earnedPoints} pts`;
    results.style.display = 'block';

    // Update points
    totalPoints += earnedPoints;
    localStorage.setItem('rfsg_points', totalPoints);
    updatePointsDisplay();

    // Save upload
    const upload = {
        id: Date.now(),
        name,
        category: selectedCategory,
        files: selectedFiles.map(f => f.name),
        confidence,
        events,
        points: earnedPoints,
        timestamp: new Date().toISOString(),
        status: 'processed'
    };
    uploads.unshift(upload);
    localStorage.setItem('rfsg_uploads', JSON.stringify(uploads));
    renderRecentUploads();

    btn.querySelector('span').textContent = 'Upload Complete';
    btn.classList.remove('uploading');
    liveBtn.style.display = 'block';

    showToast(`+${earnedPoints} Good Deed Points earned!`);
});

// ===== GO LIVE =====
document.getElementById('liveBtn').addEventListener('click', () => {
    if (uploads.length > 0) {
        uploads[0].status = 'live';
        localStorage.setItem('rfsg_uploads', JSON.stringify(uploads));
        renderRecentUploads();
    }
    showToast('Your dataset is now live on Explore!');
    document.getElementById('liveBtn').style.display = 'none';

    // Reset form
    selectedFiles = [];
    selectedCategory = '';
    renderFileList();
    document.getElementById('datasetName').value = '';
    document.getElementById('datasetDesc').value = '';
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
    document.getElementById('analysisPanel').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').querySelector('span').textContent = 'Upload & Analyze with NomadicML';
    dropZone.querySelector('.drop-main').textContent = 'Drag & drop files here';
    dropZone.querySelector('.drop-sub').textContent = 'Video, CSV, JSON, images, ROSBAG — up to 500MB';
});

// ===== HELPERS =====
function animateProgress(el, from, to, duration) {
    return new Promise(resolve => {
        const start = performance.now();
        function step(now) {
            const p = Math.min((now - start) / duration, 1);
            el.style.width = `${from + (to - from) * p}%`;
            if (p < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}

function updatePointsDisplay() {
    const el = document.getElementById('totalPoints');
    if (el) el.textContent = totalPoints;
    const nav = document.getElementById('pointsDisplay');
    if (nav) nav.textContent = `${totalPoints} pts`;
}

function renderRecentUploads() {
    const list = document.getElementById('recentList');
    if (!list) return;

    if (uploads.length === 0) {
        list.innerHTML = '<div class="recent-empty">No uploads yet. Be the first to contribute!</div>';
        return;
    }

    list.innerHTML = uploads.slice(0, 10).map(u => `
        <div class="recent-item">
            <div class="recent-thumb">${CATEGORY_EMOJI[u.category] || '📊'}</div>
            <div class="recent-info">
                <div class="recent-name">${u.name}</div>
                <div class="recent-meta">${u.files.length} file(s) · ${u.confidence}% confidence · ${new Date(u.timestamp).toLocaleDateString()}</div>
            </div>
            <span class="recent-points">+${u.points}</span>
            <span class="recent-status ${u.status === 'live' ? 'live' : 'processing'}">${u.status === 'live' ? 'LIVE' : 'PROCESSED'}</span>
        </div>
    `).join('');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}
