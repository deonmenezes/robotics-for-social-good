// ===== EXPLORE PAGE =====

const ROBOTICS_CASES = ['disaster-response', 'robotics-research', 'general-robotics', 'agriculture', 'ocean-cleanup', 'healthcare'];

const CATEGORY_LABELS = {
    'waste-segregation': 'Waste Segregation',
    'food-outreach': 'Food Assistance',
    'elder-support': 'Elder Support',
    'disaster-response': 'Disaster Response',
    'robotics-research': 'Robotics Research',
    'general-robotics': 'General Robotics',
    'agriculture': 'Agriculture',
    'ocean-cleanup': 'Ocean Cleanup',
    'healthcare': 'Healthcare',
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

function cleanSummary(s) {
    if (!s) return '';
    return s.replace(/\\n/g, ' ').replace(/\[[\d:-]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function createThumbCard(item) {
    const card = document.createElement('div');
    card.className = 'thumb-card';
    card.dataset.category = item.use_case;
    card.onclick = () => openDetail(item);

    const thumb = item.thumbnail ? `assets/${item.thumbnail}` : null;
    const cat = CATEGORY_LABELS[item.use_case] || item.use_case;
    const conf = item.confidence || 0;
    const labels = (item.event_labels || []).slice(0, 2);

    card.innerHTML = `
        <div class="thumb-img">
            ${thumb ? `<img src="${thumb}" alt="${prettifyName(item.filename)}" loading="lazy">` : `<div class="no-img">📊</div>`}
            <span class="thumb-badge">NomadicML</span>
        </div>
        <div class="thumb-body">
            <div class="thumb-title">${prettifyName(item.filename)}</div>
            <div class="thumb-meta">
                <span class="thumb-category">${cat}</span>
                <span class="thumb-confidence">${conf}%</span>
            </div>
            ${labels.length ? `<div class="thumb-labels">${labels.map(l => `<span class="thumb-label">${l}</span>`).join('')}</div>` : ''}
        </div>
    `;
    return card;
}

function openDetail(item) {
    const modal = document.getElementById('datasetModal');
    const content = document.getElementById('detailContent');
    const thumb = item.thumbnail ? `assets/${item.thumbnail}` : null;
    const cat = CATEGORY_LABELS[item.use_case] || item.use_case;
    const conf = item.confidence || 0;
    const labels = item.event_labels || [];
    const summary = cleanSummary(item.summary || item.nomadic_summary);

    content.innerHTML = `
        ${thumb ? `<div class="detail-hero"><img src="${thumb}" alt=""></div>` : ''}
        <div class="detail-body">
            <div class="detail-title">${prettifyName(item.filename)}</div>
            <div class="detail-subtitle">${cat} · ${item.source || 'community'} · ${item.event_count || 0} events</div>

            <div class="detail-section">
                <div class="detail-section-title">Analysis</div>
                <p>${summary || 'Awaiting analysis...'}</p>
            </div>

            ${labels.length ? `
            <div class="detail-section">
                <div class="detail-section-title">Labels</div>
                <div class="detail-tags">
                    ${labels.map(l => `<span class="detail-tag">${l}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <div class="detail-section-title">Confidence</div>
                <div class="detail-conf-row">
                    <span class="detail-conf-num">${conf}%</span>
                    <div class="detail-conf-bar">
                        <div class="detail-conf-fill" style="width:${conf}%"></div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">License</div>
                <p>CC-BY-4.0 — Free to use, share, and adapt.</p>
            </div>

            ${item.analyzed_at ? `
            <div class="detail-section">
                <div class="detail-section-title">Labeled</div>
                <p>${new Date(item.analyzed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
            ` : ''}

            <div class="detail-actions">
                <a href="labels.json" download class="btn btn-white">Download JSON</a>
                <a href="index.html#upload" class="btn btn-outline">Donate Data & Get Paid</a>
            </div>
        </div>
    `;
    modal.classList.add('active');
}

async function loadData() {
    try {
        const res = await fetch('labels.json');
        if (!res.ok) throw new Error();
        const labels = await res.json();
        const grid = document.getElementById('thumbGrid');

        document.getElementById('totalCount').textContent = `${labels.length} datasets`;

        function render(filter) {
            grid.innerHTML = '';
            let filtered;
            if (filter === 'all') filtered = labels;
            else if (filter === 'robotics') filtered = labels.filter(l => ROBOTICS_CASES.includes(l.use_case));
            else filtered = labels.filter(l => l.use_case === filter);

            if (!filtered.length) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted);font-size:0.85rem;">No datasets in this category yet.</div>';
                return;
            }
            filtered.forEach(item => grid.appendChild(createThumbCard(item)));
        }

        render('all');

        document.getElementById('filterBar').addEventListener('click', e => {
            if (!e.target.classList.contains('pill')) return;
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            render(e.target.dataset.filter);
        });

    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

// Detail panel close
document.getElementById('detailClose').addEventListener('click', () => {
    document.getElementById('datasetModal').classList.remove('active');
});
document.getElementById('datasetModal').addEventListener('click', e => {
    if (e.target === document.getElementById('datasetModal')) {
        document.getElementById('datasetModal').classList.remove('active');
    }
});

loadData();
