// ===== UPLOAD PAGE JS =====

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
        '.upload-card, .payment-card, .cta-card'
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

if (uploadZone && fileInput) {
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
}

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
        if (customPriceInput) {
            customPriceInput.style.display = radio.value === 'custom' ? 'block' : 'none';
        }
    });
});

// ===== SUBMIT DATASET =====
const submitBtn = document.getElementById('submitDataset');
if (submitBtn) {
    submitBtn.addEventListener('click', () => {
        const name = document.getElementById('datasetName').value;
        const category = document.getElementById('datasetCategory').value;

        if (!name || !category) {
            showToast('Please fill in the dataset name and category');
            return;
        }

        // Simulate submission
        showToast('Dataset submitted successfully! Thank you for contributing to social good.');

        // Reset form
        document.getElementById('datasetName').value = '';
        document.getElementById('datasetCategory').value = '';
        const descEl = document.getElementById('datasetDesc');
        if (descEl) descEl.value = '';
        if (uploadZone) {
            uploadZone.querySelector('h3').textContent = 'Drag & Drop Your Dataset';
            uploadZone.querySelector('p').textContent = 'Support for video, CSV, JSON, sensor logs, ROSBAG, and image archives';
        }
    });
}

console.log('Robotics for Social Good — Upload page loaded successfully');
