// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');
mobileToggle.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '100%';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.flexDirection = 'column';
    navLinks.style.background = 'var(--bg-secondary)';
    navLinks.style.padding = '24px';
    navLinks.style.gap = '16px';
    navLinks.style.borderBottom = '1px solid var(--border)';
});

// ===== ANIMATED COUNTERS =====
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.floor(target * eased).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
            else counter.textContent = target.toLocaleString();
        }
        requestAnimationFrame(update);
    });
}

// Start counter animation when hero is in view
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            heroObserver.disconnect();
        }
    });
}, { threshold: 0.3 });
heroObserver.observe(document.querySelector('.hero-stats'));

// ===== SCROLL REVEAL =====
function setupReveal() {
    const elements = document.querySelectorAll(
        '.feature-card, .pipeline-step, .impact-card, .pricing-card, .upload-card, .payment-card, .cta-card'
    );
    elements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 100);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => revealObserver.observe(el));
}
setupReveal();

// ===== FILE UPLOAD =====
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (files.length === 0) return;
    const names = Array.from(files).map(f => f.name).join(', ');
    const size = Array.from(files).reduce((a, f) => a + f.size, 0);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    uploadZone.querySelector('h3').textContent = `${files.length} file(s) selected`;
    uploadZone.querySelector('p').textContent = `${names} (${sizeMB} MB)`;
    showToast(`${files.length} file(s) ready for upload`);
}

// ===== PAYMENT OPTIONS =====
const paymentRadios = document.querySelectorAll('input[name="payment"]');
const customPriceInput = document.getElementById('customPriceInput');

paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        customPriceInput.style.display = radio.value === 'custom' ? 'block' : 'none';
    });
});

// ===== SUBMIT DATASET =====
document.getElementById('submitDataset').addEventListener('click', () => {
    const name = document.getElementById('datasetName').value;
    const category = document.getElementById('datasetCategory').value;
    const desc = document.getElementById('datasetDesc').value;
    const email = document.getElementById('payoutEmail').value;
    const paymentType = document.querySelector('input[name="payment"]:checked').value;

    if (!name || !category) {
        showToast('Please fill in the dataset name and category');
        return;
    }

    // Simulate submission
    showToast('Dataset submitted successfully! Thank you for contributing to social good.');

    // Reset form
    document.getElementById('datasetName').value = '';
    document.getElementById('datasetCategory').value = '';
    document.getElementById('datasetDesc').value = '';
    uploadZone.querySelector('h3').textContent = 'Drag & Drop Your Dataset';
    uploadZone.querySelector('p').textContent = 'Support for video, CSV, JSON, sensor logs, ROSBAG, and image archives';
});

// ===== PAYMENT MODAL =====
const paymentModal = document.getElementById('paymentModal');
const modalClose = document.getElementById('modalClose');
const modalPlan = document.getElementById('modalPlan');
const paymentForm = document.getElementById('paymentForm');

function handlePayment(plan) {
    const prices = { researcher: '$29/month', organization: '$99/month' };
    modalPlan.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${prices[plan]}`;
    paymentModal.classList.add('active');
}

// Make handlePayment globally available
window.handlePayment = handlePayment;

modalClose.addEventListener('click', () => {
    paymentModal.classList.remove('active');
});

paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) paymentModal.classList.remove('active');
});

// Card number formatting
document.getElementById('cardNumber').addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    e.target.value = val.replace(/(\d{4})/g, '$1 ').trim();
});

paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    paymentModal.classList.remove('active');
    showToast('Subscription activated! Welcome aboard. Let\'s build a better world together.');
});

// ===== NEWSLETTER =====
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    if (email) {
        showToast('Subscribed! You\'ll receive impact updates and opportunities.');
        e.target.querySelector('input').value = '';
    }
});

// ===== TOAST =====
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        }
    });
});

// ===== VIDEO SHOWCASE =====
// Thumbnails are now loaded from labels.json thumbnail field

const CATEGORY_EMOJI = {
    'waste-segregation': '♻️',
    'food-outreach': '🍕',
    'elder-support': '🧓',
    'disaster-response': '🚑',
    'robotics-research': '🤖',
    'agriculture': '🌾',
    'ocean-cleanup': '🌊',
    'healthcare': '🏥',
    'general-robotics': '⚙️',
    'needs-review': '🔍',
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

function truncateSummary(summary, maxLen = 150) {
    if (!summary) return 'Awaiting analysis...';
    const clean = summary.replace(/\\n/g, ' ').replace(/\[[\d:]+\]/g, '').trim();
    return clean.length > maxLen ? clean.substring(0, maxLen) + '...' : clean;
}

async function loadShowcase() {
    const grid = document.getElementById('showcaseGrid');
    const filtersEl = document.getElementById('showcaseFilters');
    if (!grid) return;

    try {
        const res = await fetch('labels.json');
        if (!res.ok) throw new Error('labels.json not found');
        const labels = await res.json();

        // Build filter buttons
        const categories = [...new Set(labels.map(v => v.use_case))];
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = cat;
            btn.textContent = (CATEGORY_EMOJI[cat] || '') + ' ' + (cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            filtersEl.appendChild(btn);
        });

        // Render cards
        function renderCards(filter) {
            const filtered = filter === 'all' ? labels : labels.filter(v => v.use_case === filter);
            grid.innerHTML = '';
            document.getElementById('showcaseEmpty').style.display = filtered.length === 0 ? 'block' : 'none';

            filtered.forEach(video => {
                const thumb = video.thumbnail ? `assets/${video.thumbnail}` : null;
                const confidence = video.confidence || 0;
                const card = document.createElement('div');
                card.className = 'showcase-card reveal visible';
                card.dataset.category = video.use_case;

                card.innerHTML = `
                    <div class="showcase-thumb">
                        ${thumb
                            ? `<img src="${thumb}" alt="${video.filename}" loading="lazy">`
                            : `<div class="no-thumb">${CATEGORY_EMOJI[video.use_case] || '🤖'}</div>`
                        }
                        ${video.status === 'classified'
                            ? '<div class="showcase-nomadic-badge">Labeled</div>'
                            : ''
                        }
                        <div class="showcase-category-tag">${video.use_case_title || video.use_case}</div>
                    </div>
                    <div class="showcase-body">
                        <h3>${prettifyName(video.filename)}</h3>
                        <p class="showcase-summary">${truncateSummary(video.summary || video.nomadic_summary)}</p>
                        ${video.event_labels && video.event_labels.length > 0 ? `
                            <div class="showcase-labels">
                                ${video.event_labels.slice(0, 3).map(l => `<span class="showcase-label-tag">${l}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="showcase-meta">
                            <div class="showcase-confidence">
                                <span>${confidence}%</span>
                                <div class="confidence-bar">
                                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                                </div>
                            </div>
                            <span class="showcase-events">${video.event_count || 0} events</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        renderCards('all');

        // Filter click handlers
        filtersEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('filter-btn')) return;
            filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderCards(e.target.dataset.filter);
        });

    } catch (err) {
        console.warn('Could not load showcase:', err);
        grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">Video showcase loading... Run label_videos.py to generate labels.</p>';
    }
}

loadShowcase();

console.log('Robotics for Social Good — Platform loaded successfully');
