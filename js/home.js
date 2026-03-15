// ===== HOME PAGE JS =====

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ===== MOBILE MENU =====
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');
if (mobileToggle && navLinks) {
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
}

// ===== TOAST =====
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

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
const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                heroObserver.disconnect();
            }
        });
    }, { threshold: 0.3 });
    heroObserver.observe(heroStats);
}

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

// ===== NEWSLETTER =====
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input').value;
        if (email) {
            showToast('Subscribed! You\'ll receive impact updates and opportunities.');
            e.target.querySelector('input').value = '';
        }
    });
}

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.innerWidth <= 768 && navLinks) {
                navLinks.style.display = 'none';
            }
        }
    });
});

// ===== VIDEO SHOWCASE =====
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
                            ? '<div class="showcase-nomadic-badge">Labeled by NomadicML</div>'
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

console.log('Robotics for Social Good — Home loaded successfully');
