const CATEGORY_EMOJI = {
    'waste-segregation': '♻',
    'food-outreach': '🍕',
    'elder-support': '🧓',
    'disaster-response': '🚑',
    'healthcare': '🏥',
    'agriculture': '🌾',
    'education': '📚',
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

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (_error) {
        throw new Error(text);
    }
}

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
    progressFill.style.width = '18%';

    const file = selectedFiles[0];
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('name', name);
    formData.append('category', selectedCategory);
    formData.append('description', description);

    try {
        analysisStatus.textContent = 'Analyzing upload...';
        progressFill.style.width = '52%';

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const payload = await readJsonResponse(response);
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || 'Upload failed.');
        }

        progressFill.style.width = '100%';
        analysisStatus.textContent = 'Live in explore';
        analysisStatus.className = 'analysis-status done';

        const entry = payload.entry;
        const isFree = document.querySelector('input[name="payout"]:checked').value === 'free';
        const basePoints = 50;
        const verifiedBonus = (entry.confidence || 0) > 90 ? 100 : 50;
        const freeBonus = isFree ? 50 : 0;
        const earnedPoints = basePoints + verifiedBonus + freeBonus;

        document.getElementById('resultCategory').textContent = `${CATEGORY_EMOJI[entry.use_case] || ''} ${entry.use_case_title}`;
        document.getElementById('resultConfidence').textContent = `${entry.confidence || 0}%`;
        document.getElementById('resultEvents').textContent = `${entry.event_count || 0} events detected`;
        document.getElementById('resultSummary').textContent = entry.summary || 'Analysis completed successfully.';
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

        showToast('Upload analyzed and published to Explore.');
        resetForm();
    } catch (error) {
        analysisStatus.textContent = error.message;
        analysisStatus.className = 'analysis-status error';
        progressFill.style.width = '0%';
        showToast(error.message);
    } finally {
        setBusyState(false);
    }
});

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
            <span class="recent-status live">LIVE</span>
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
