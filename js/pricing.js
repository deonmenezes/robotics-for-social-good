// ===== PRICING PAGE JS =====

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
        '.feature-card, .pricing-card, .cta-card'
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

// ===== PAYMENT MODAL =====
const paymentModal = document.getElementById('paymentModal');
const modalClose = document.getElementById('modalClose');
const modalPlan = document.getElementById('modalPlan');
const paymentForm = document.getElementById('paymentForm');

function handlePayment(plan) {
    const prices = { researcher: '$29/month', organization: '$99/month' };
    if (modalPlan) {
        modalPlan.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${prices[plan]}`;
    }
    if (paymentModal) {
        paymentModal.classList.add('active');
    }
}

// Make handlePayment globally available
window.handlePayment = handlePayment;

if (modalClose) {
    modalClose.addEventListener('click', () => {
        paymentModal.classList.remove('active');
    });
}

if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.classList.remove('active');
    });
}

// Card number formatting
const cardNumber = document.getElementById('cardNumber');
if (cardNumber) {
    cardNumber.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 16);
        e.target.value = val.replace(/(\d{4})/g, '$1 ').trim();
    });
}

if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (paymentModal) paymentModal.classList.remove('active');
        showToast('Subscription activated! Welcome aboard. Let\'s build a better world together.');
    });
}

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

console.log('Robotics for Social Good — Pricing page loaded successfully');
