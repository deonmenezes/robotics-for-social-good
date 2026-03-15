// ===== EXPLORE PAGE - Load and display open datasets =====

const CATEGORY_MAP = {
    'waste-segregation': { grid: 'wasteGrid', count: 'wasteCount', emoji: '♻️' },
    'food-outreach': { grid: 'foodGrid', count: 'foodCount', emoji: '🍕' },
    'elder-support': { grid: 'elderGrid', count: 'elderCount', emoji: '🧓' },
};

const ROBOTICS_CASES = ['disaster-response', 'robotics-research', 'general-robotics', 'agriculture', 'ocean-cleanup', 'healthcare'];

const CATEGORY_EMOJI = {
    'waste-segregation': '♻️',
    'food-outreach': '🍕',
    'elder-support': '🧓',
    'disaster-response': '🚑',
    'robotics-research': '🤖',
    'general-robotics': '⚙️',
    'agriculture': '🌾',
    'ocean-cleanup': '🌊',
    'healthcare': '🏥',
};

function prettifyName(filename) {
    return filename
        .replace(/\.(mp4|mov|avi|mkv|webm|MOV)$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/^Img /i, 'Field Video ')
        .replace(/^G1 /i, 'Unitree G1 ')
        .replace(/^Go2 /i, 'Unitree Go2 ');
}

function cleanSummary(summary) {
    if (!summary) return 'Awaiting analysis...';
    return summary.replace(/\\n/g, ' ').replace(/\[[\d:-]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(text, len = 120) {
    const clean = cleanSummary(text);
    return clean.length > len ? clean.substring(0, len) + '...' : clean;
}

function createDataCard(item) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.onclick = () => showDatasetModal(item);

    const labels = (item.event_labels || []).slice(0, 2);
    const confidence = item.confidence || 0;

    card.innerHTML = `
        <div class="data-card-top">
            <span class="data-card-name">${prettifyName(item.filename)}</span>
            <span class="data-card-status ${item.status || 'pending'}">${item.status === 'classified' ? 'Labeled' : 'Pending'}</span>
        </div>
        <p class="data-card-summary">${truncate(item.summary)}</p>
        <div class="data-card-meta">
            <span class="data-card-confidence">Confidence: <strong>${confidence}%</strong></span>
            <div class="data-card-labels">
                ${labels.map(l => `<span class="data-card-label">${l}</span>`).join('')}
            </div>
            <span class="data-card-download">Open Source ↗</span>
        </div>
    `;
    return card;
}

function showDatasetModal(item) {
    const modal = document.getElementById('datasetModal');
    const content = document.getElementById('datasetModalContent');
    const emoji = CATEGORY_EMOJI[item.use_case] || '📊';
    const confidence = item.confidence || 0;
    const labels = item.event_labels || [];

    content.innerHTML = `
        <div class="modal-dataset-header">
            <div class="modal-dataset-icon">${emoji}</div>
            <div>
                <div class="modal-dataset-title">${prettifyName(item.filename)}</div>
                <div class="modal-dataset-meta">${item.use_case_title || item.use_case} &middot; ${item.source || 'community'} &middot; ${item.event_count || 0} events detected</div>
            </div>
        </div>

        <div class="modal-section">
            <h4>NomadicML Analysis</h4>
            <p>${cleanSummary(item.summary)}</p>
        </div>

        ${labels.length > 0 ? `
        <div class="modal-section">
            <h4>Detected Labels</h4>
            <div class="modal-labels">
                ${labels.map(l => `<span class="modal-label">${l}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        <div class="modal-section">
            <h4>AI Confidence: ${confidence}%</h4>
            <div class="modal-confidence-bar">
                <div class="modal-confidence-fill" style="width: ${confidence}%"></div>
            </div>
        </div>

        <div class="modal-section">
            <h4>License</h4>
            <p>CC-BY-4.0 — Free to use, share, and adapt with attribution.</p>
        </div>

        ${item.analyzed_at ? `
        <div class="modal-section">
            <h4>Labeled At</h4>
            <p>${new Date(item.analyzed_at).toLocaleString()}</p>
        </div>
        ` : ''}

        <div class="modal-download-btn">
            <a href="labels.json" download class="btn btn-primary btn-full">Download Labels (JSON)</a>
        </div>
    `;
    modal.classList.add('active');
}

async function loadExploreData() {
    try {
        const res = await fetch('labels.json');
        if (!res.ok) throw new Error('labels.json not found');
        const labels = await res.json();

        // Count totals
        document.getElementById('totalDatasets').textContent = labels.length;
        document.getElementById('totalLabeled').textContent = labels.filter(l => l.status === 'classified').length;

        // Sort into categories
        const waste = labels.filter(l => l.use_case === 'waste-segregation');
        const food = labels.filter(l => l.use_case === 'food-outreach');
        const elder = labels.filter(l => l.use_case === 'elder-support');
        const robotics = labels.filter(l => ROBOTICS_CASES.includes(l.use_case));

        // Update counts
        document.getElementById('wasteCount').textContent = waste.length;
        document.getElementById('foodCount').textContent = food.length;
        document.getElementById('elderCount').textContent = elder.length;
        document.getElementById('roboticsCount').textContent = robotics.length;

        // Populate grids
        const wasteGrid = document.getElementById('wasteGrid');
        const foodGrid = document.getElementById('foodGrid');
        const elderGrid = document.getElementById('elderGrid');
        const roboticsGrid = document.getElementById('roboticsGrid');

        function fillGrid(grid, items) {
            if (items.length === 0) {
                grid.innerHTML = '<div class="data-empty">No datasets yet. Be the first to contribute!</div>';
                return;
            }
            items.forEach(item => grid.appendChild(createDataCard(item)));
        }

        fillGrid(wasteGrid, waste);
        fillGrid(foodGrid, food);
        fillGrid(elderGrid, elder);
        fillGrid(roboticsGrid, robotics);

    } catch (err) {
        console.error('Failed to load explore data:', err);
    }
}

// Modal close handlers
document.getElementById('dataModalClose').addEventListener('click', () => {
    document.getElementById('datasetModal').classList.remove('active');
});
document.getElementById('datasetModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('datasetModal')) {
        document.getElementById('datasetModal').classList.remove('active');
    }
});

// Load data
loadExploreData();
