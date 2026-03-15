// ===== SHARED JS — used by pages that only need nav + toast =====

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

// ===== SCROLL REVEAL =====
function setupReveal() {
    const elements = document.querySelectorAll(
        '.feature-card, .pipeline-step, .impact-card, .pricing-card, .upload-card, .payment-card, .cta-card, .impact-story-card'
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

console.log('Robotics for Social Good — Page loaded successfully');
