const CATEGORY_EMOJI = {
    'waste-segregation': '♻',
    'food-outreach': '🍕',
    'elder-support': '🧓',
    'disaster-response': '🚑',
    'healthcare': '🏥',
    'agriculture': '🌾',
    'education': '📚',
};

const CATEGORY_LABELS = {
    'waste-segregation': 'Waste Segregation',
    'food-outreach': 'Food Assistance',
    'elder-support': 'Elder Support',
    'disaster-response': 'Disaster Response',
    'healthcare': 'Healthcare',
    'agriculture': 'Agriculture',
    'education': 'Education',
};

let selectedFiles = [];
let selectedCategory = '';
let uploads = JSON.parse(localStorage.getItem('rfsg_uploads') || '[]');
let totalPoints = parseInt(localStorage.getItem('rfsg_points') || '0', 10);

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const submitBtn = document.getElementById('submitBtn');
const analysisPanel = document.getElementById('analysisPanel');
const analysisStatus = document.getElementById('analysisStatus');
const analysisResults = document.getElementById('analysisResults');
const progressFill = document.getElementById('progressFill');

updatePointsDisplay();
renderRecentUploads();

browseBtn.addEventListener('click', event => {
    event.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', event => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    addFiles(event.dataTransfer.files);
});
fileInput.addEventListener('change', event => addFiles(event.target.files));

function addFiles(fileListObject) {
    selectedFiles = Array.from(fileListObject || []);
    renderFileList();
    checkReady();
}

function renderFileList() {
    if (!selectedFiles.length) {
        fileList.innerHTML = '';
        dropZone.classList.remove('has-files');
        return;
    }

    dropZone.classList.add('has-files');
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    dropZone.querySelector('.drop-main').textContent = `${selectedFiles.length} file(s) selected`;
    dropZone.querySelector('.drop-sub').textContent = `${(totalSize / 1024 / 1024).toFixed(1)} MB total`;

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button class="file-remove" data-idx="${index}">&times;</button>
        </div>
    `).join('');

    fileList.querySelectorAll('.file-remove').forEach(button => {
        button.addEventListener('click', () => {
            selectedFiles.splice(parseInt(button.dataset.idx, 10), 1);
            renderFileList();
            checkReady();
        });
    });
}

document.getElementById('categoryPills').addEventListener('click', event => {
    const pill = event.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach(item => item.classList.remove('selected'));
    pill.classList.add('selected');
    selectedCategory = pill.dataset.cat;
    checkReady();
});

document.querySelectorAll('.payout-opt').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.payout-opt').forEach(item => item.classList.remove('selected'));
        option.classList.add('selected');
        const value = option.querySelector('input').value;
        document.getElementById('paidFields').style.display = value === 'paid' ? 'block' : 'none';
    });
});

document.getElementById('datasetName').addEventListener('input', checkReady);

function checkReady() {
    const name = document.getElementById('datasetName').value.trim();
    submitBtn.disabled = !(selectedFiles.length > 0 && selectedCategory && name);
}

submitBtn.addEventListener('click', async () => {
    const name = document.getElementById('datasetName').value.trim();
    const description = document.getElementById('datasetDesc').value.trim();
    if (!name || !selectedCategory || !selectedFiles.length) {
        return;
    }

    setBusyState(true);
    analysisPanel.style.display = 'block';
    analysisResults.style.display = 'none';
    analysisStatus.textContent = 'Uploading file...';
    analysisStatus.className = 'analysis-status';
    progressFill.style.width = '12%';

    await animateProgress(44, 400);
    analysisStatus.textContent = 'Running demo analysis...';
    await animateProgress(78, 700);

    const entry = buildSimulatedEntry(name, description);
    const earnedPoints = calculatePoints(entry.confidence);

    storeSimulatedEntry(entry);

    document.getElementById('resultCategory').textContent = `${CATEGORY_EMOJI[entry.use_case] || ''} ${entry.use_case_title}`;
    document.getElementById('resultConfidence').textContent = `${entry.confidence || 0}%`;
    document.getElementById('resultEvents').textContent = `${entry.event_count || 0} events detected`;
    document.getElementById('resultSummary').textContent = entry.summary;
    document.getElementById('resultPoints').textContent = `+${earnedPoints} pts`;
    analysisResults.style.display = 'block';

    totalPoints += earnedPoints;
    localStorage.setItem('rfsg_points', String(totalPoints));
    updatePointsDisplay();

    uploads.unshift({
        id: Date.now(),
        name: entry.filename,
        category: entry.use_case,
        files: selectedFiles.map(item => item.name),
        confidence: entry.confidence || 0,
        events: entry.event_count || 0,
        points: earnedPoints,
        timestamp: entry.analyzed_at || new Date().toISOString(),
        status: 'live',
    });
    localStorage.setItem('rfsg_uploads', JSON.stringify(uploads));
    renderRecentUploads();

    progressFill.style.width = '100%';
    analysisStatus.textContent = 'Saved locally for demo';
    analysisStatus.className = 'analysis-status done';
    showToast('Demo upload complete. It will appear in Explore on this browser.');

    setBusyState(false);
    resetForm();
});

function buildSimulatedEntry(name, description) {
    const eventCount = Math.max(1, Math.min(4, selectedFiles.length + Math.floor(Math.random() * 2)));
    const confidence = 82 + Math.floor(Math.random() * 17);
    const summary = description
        ? `${description} This demo analysis classified the upload as ${CATEGORY_LABELS[selectedCategory] || 'General Robotics'} and generated ${eventCount} event label(s).`
        : `This demo analysis classified the upload as ${CATEGORY_LABELS[selectedCategory] || 'General Robotics'} and generated ${eventCount} event label(s) from the uploaded media.`;

    return {
        filename: name,
        source: 'demo-upload',
        path: name,
        status: 'classified',
        use_case: selectedCategory,
        use_case_title: CATEGORY_LABELS[selectedCategory] || 'General Robotics',
        summary: summary,
        nomadic_summary: summary,
        confidence: confidence,
        event_count: eventCount,
        event_labels: buildEventLabels(selectedCategory, eventCount),
        analyzed_at: new Date().toISOString(),
        thumbnail: null,
    };
}

function buildEventLabels(category, count) {
    const seeds = {
        'waste-segregation': ['Waste Sorting', 'Reusable Detection', 'Bin Placement'],
        'food-outreach': ['Meal Delivery', 'Object Pickup', 'Distribution Route'],
        'elder-support': ['Mobility Assist', 'Human Following', 'Safety Check'],
        'disaster-response': ['Terrain Traversal', 'Recovery Action', 'Hazard Response'],
        'healthcare': ['Supply Transport', 'Monitoring Pass', 'Task Assistance'],
        'agriculture': ['Field Sweep', 'Crop Check', 'Autonomy Test'],
        'education': ['Demo Movement', 'Teaching Assist', 'Interaction Pass'],
    };
    const labels = seeds[category] || ['Robot Action', 'Scene Understanding', 'Task Detection'];
    return labels.slice(0, count);
}

function calculatePoints(confidence) {
    const isFree = document.querySelector('input[name="payout"]:checked').value === 'free';
    const basePoints = 50;
    const verifiedBonus = confidence > 90 ? 100 : 50;
    const freeBonus = isFree ? 50 : 0;
    return basePoints + verifiedBonus + freeBonus;
}

function storeSimulatedEntry(entry) {
    const existing = JSON.parse(localStorage.getItem('rfsg_simulated_entries') || '[]');
    const next = [entry].concat(existing.filter(item => item.filename !== entry.filename)).slice(0, 50);
    localStorage.setItem('rfsg_simulated_entries', JSON.stringify(next));
}

function animateProgress(target, duration) {
    return new Promise(resolve => {
        const startWidth = parseFloat(progressFill.style.width || '0');
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const current = startWidth + ((target - startWidth) * progress);
            progressFill.style.width = `${current}%`;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

function setBusyState(isBusy) {
    submitBtn.disabled = isBusy;
    submitBtn.classList.toggle('uploading', isBusy);
    submitBtn.querySelector('span').textContent = isBusy ? 'Uploading...' : 'Upload & Analyze';
}

function resetForm() {
    selectedFiles = [];
    selectedCategory = '';
    renderFileList();
    document.getElementById('datasetName').value = '';
    document.getElementById('datasetDesc').value = '';
    document.querySelectorAll('.cat-pill').forEach(item => item.classList.remove('selected'));
    document.getElementById('paidFields').style.display = 'none';
    checkReady();
}

function updatePointsDisplay() {
    const total = document.getElementById('totalPoints');
    const nav = document.getElementById('pointsDisplay');
    if (total) total.textContent = String(totalPoints);
    if (nav) nav.textContent = `${totalPoints} pts`;
}

function renderRecentUploads() {
    const list = document.getElementById('recentList');
    if (!list) return;

    if (!uploads.length) {
        list.innerHTML = '<div class="recent-empty">No uploads yet. Be the first to contribute!</div>';
        return;
    }

    list.innerHTML = uploads.slice(0, 10).map(upload => `
        <div class="recent-item">
            <div class="recent-thumb">${CATEGORY_EMOJI[upload.category] || '📊'}</div>
            <div class="recent-info">
                <div class="recent-name">${upload.name}</div>
                <div class="recent-meta">${upload.files.length} file(s) · ${upload.confidence}% confidence · ${new Date(upload.timestamp).toLocaleDateString()}</div>
            </div>
            <span class="recent-points">+${upload.points}</span>
            <span class="recent-status live">LOCAL</span>
        </div>
    `).join('');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}
