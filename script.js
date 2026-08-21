// script.js — Booking modal, WhatsApp notify, Reviews, Calendar

const API_BASE = 'https://mehandi-art.onrender.com/api';

// ── Open / Close booking modal ────────────────────────────────────────────────
function bookNow() {
  document.getElementById('bookingModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('bookingModal').classList.remove('open');
  document.body.style.overflow = '';
  const form = document.getElementById('bookingForm');
  form.reset();
  // Restore required attributes for next booking
  document.getElementById('bk_name').setAttribute('required', '');
  document.getElementById('bk_phone').setAttribute('required', '');
  document.getElementById('bk_date').setAttribute('required', '');
  document.getElementById('bk_design').setAttribute('required', '');
  document.getElementById('formMsg').textContent = '';
  document.getElementById('formMsg').className = 'form-msg';
}

// Close modal on outside click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  const dateInput = document.getElementById('bk_date');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  const form = document.getElementById('bookingForm');
  if (form) form.addEventListener('submit', handleBookingSubmit);

  // Load live reviews on page load
  loadReviews();
});

// ── Validate booking form ────────────────────────────────────────────────────
function validateBooking(payload) {
  const errors = [];

  if (!payload.name || payload.name.length < 2) {
    errors.push('Please enter your full name.');
  }

  const phoneDigits = payload.phone.replace(/[\s\-()]/g, '');
  if (!/^(\+91)?[6-9]\d{9}$/.test(phoneDigits)) {
    errors.push('Please enter a valid 10-digit phone number.');
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Please enter a valid email address, or leave it blank.');
  }

  if (!payload.event_date) {
    errors.push('Please choose an event date.');
  } else {
    const today = new Date(); today.setHours(0,0,0,0);
    const chosen = new Date(payload.event_date + 'T00:00:00');
    if (chosen < today) errors.push('Event date can\'t be in the past.');
  }

  if (!payload.design_type) {
    errors.push('Please select a design type.');
  }

  return errors;
}

// ── Submit booking + WhatsApp notify ─────────────────────────────────────────
async function handleBookingSubmit(e) {
  e.preventDefault();

  const msgEl = document.getElementById('formMsg');
  const btn   = document.getElementById('submitBtn');

  const payload = {
    name:        document.getElementById('bk_name').value.trim(),
    phone:       document.getElementById('bk_phone').value.trim(),
    email:       document.getElementById('bk_email').value.trim(),
    event_date:  document.getElementById('bk_date').value,
    design_type: document.getElementById('bk_design').value,
    num_hands:   parseInt(document.getElementById('bk_hands').value, 10),
    message:     document.getElementById('bk_message').value.trim(),
  };

  const errors = validateBooking(payload);
  if (errors.length > 0) {
    msgEl.textContent = '❌ ' + errors[0];
    msgEl.className   = 'form-msg error';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Booking...';
  msgEl.textContent = '';
  msgEl.className   = 'form-msg';

  try {
    const response = await fetch(`${API_BASE}/appointments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      msgEl.textContent = '✅ Appointment booked! We will call you to confirm.';
      msgEl.className   = 'form-msg success';

      // Build WhatsApp URL on frontend and open via link click (avoids popup blockers)
      const waMsg =
        `🌿 *New Mehandi Booking!*\n\n` +
        `👤 *Name:* ${payload.name}\n` +
        `📱 *Phone:* ${payload.phone}\n` +
        `📅 *Event Date:* ${payload.event_date}\n` +
        `🎨 *Design:* ${payload.design_type}\n` +
        `🖐 *Hands:* ${payload.num_hands}\n` +
        (payload.email  ? `📧 *Email:* ${payload.email}\n`   : '') +
        (payload.message ? `📝 *Note:* ${payload.message}\n` : '') +
        `\n_Please confirm the appointment._`;

      const waUrl = `https://wa.me/919209288732?text=${encodeURIComponent(waMsg)}`;
      const waLink = document.createElement('a');
      waLink.href = waUrl;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      document.body.appendChild(waLink);
      waLink.click();
      document.body.removeChild(waLink);

      // Disable all inputs before reset to prevent browser validation firing on empty required fields
      const form = document.getElementById('bookingForm');
      form.querySelectorAll('input, select, textarea').forEach(el => el.removeAttribute('required'));
      form.reset();

      setTimeout(closeModal, 3000);
    } else {
      msgEl.textContent = `❌ ${result.error || 'Something went wrong. Please try again.'}`;
      msgEl.className   = 'form-msg error';
    }
  } catch (err) {
    msgEl.textContent = '❌ Cannot reach server. Make sure the backend is running on port 3000.';
    msgEl.className   = 'form-msg error';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Confirm Booking';
  }
}

// ── Load & display live reviews ───────────────────────────────────────────────
async function loadReviews() {
  const container = document.getElementById('liveReviews');
  if (!container) return;

  try {
    const res  = await fetch(`${API_BASE}/reviews`);
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = data.data.map(r => `
        <div class="review">
          <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <p>"${escHtml(r.comment)}"</p>
          <div class="who">— ${escHtml(r.name)}${r.design_type ? ' · ' + escHtml(r.design_type) : ''}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    // Backend not running — static reviews remain visible
    console.log('Reviews: using static fallback');
  }
}

// ── Open / Close review modal ─────────────────────────────────────────────────
function openReviewModal() {
  document.getElementById('reviewModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewMsg').textContent = '';
  document.getElementById('reviewMsg').className = 'form-msg';
  resetStars();
}

// ── Star rating picker ────────────────────────────────────────────────────────
let selectedRating = 0;

function setRating(val) {
  selectedRating = val;
  document.querySelectorAll('.star-btn').forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

function resetStars() {
  selectedRating = 0;
  document.querySelectorAll('.star-btn').forEach(s => s.classList.remove('active'));
}

// ── Submit review ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);

  const reviewModal = document.getElementById('reviewModal');
  if (reviewModal) {
    reviewModal.addEventListener('click', (e) => { if (e.target === reviewModal) closeReviewModal(); });
  }
});

async function handleReviewSubmit(e) {
  e.preventDefault();

  const msgEl = document.getElementById('reviewMsg');
  const btn   = document.getElementById('reviewSubmitBtn');

  const payload = {
    name:        document.getElementById('rv_name').value.trim(),
    rating:      selectedRating,
    comment:     document.getElementById('rv_comment').value.trim(),
    design_type: document.getElementById('rv_design').value,
  };

  if (!payload.name || payload.name.length < 2) {
    msgEl.textContent = '❌ Please enter your name.';
    msgEl.className   = 'form-msg error';
    return;
  }

  if (selectedRating === 0) {
    msgEl.textContent = '❌ Please select a star rating.';
    msgEl.className   = 'form-msg error';
    return;
  }

  if (!payload.comment || payload.comment.length < 5) {
    msgEl.textContent = '❌ Please write a short review (at least 5 characters).';
    msgEl.className   = 'form-msg error';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const res    = await fetch(`${API_BASE}/reviews`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    if (res.ok && result.success) {
      msgEl.textContent = '✅ Thank you! Your review will appear after approval.';
      msgEl.className   = 'form-msg success';
      document.getElementById('reviewForm').reset();
      resetStars();
      setTimeout(closeReviewModal, 3000);
    } else {
      msgEl.textContent = `❌ ${result.error || 'Could not submit. Try again.'}`;
      msgEl.className   = 'form-msg error';
    }
  } catch (err) {
    msgEl.textContent = '❌ Cannot reach server.';
    msgEl.className   = 'form-msg error';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Review';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Scroll reveal animation ───────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const delay = entry.target.classList.contains('card')
        ? (Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80)
        : 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

// If page loaded with a hash (e.g. index.html#designs), show ALL cards immediately
if (window.location.hash) {
  // Mark everything visible right away — no animation on hash navigation
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
} else {
  // Normal page load — animate on scroll
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ── Reviews slider ────────────────────────────────────────────────────────────
let slideIndex = 0;
let slideInterval;

function initSlider() {
  const track = document.getElementById('reviewsTrack');
  const dots  = document.getElementById('sliderDots');
  if (!track || !dots) return;

  const cards = track.querySelectorAll('.review');
  const total = cards.length;

  // Build dots
  dots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('button');
    d.className = 'dot-indicator' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Review ${i+1}`);
    d.onclick = () => goToSlide(i);
    dots.appendChild(d);
  }

  goToSlide(0);
  startAutoSlide();
}

function goToSlide(index) {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;

  const cards     = track.querySelectorAll('.review');
  const total     = cards.length;
  const visible   = window.innerWidth < 600 ? 1 : window.innerWidth < 900 ? 1 : 2;
  const maxIndex  = Math.max(0, total - visible);

  slideIndex = Math.max(0, Math.min(index, maxIndex));

  const cardWidth = cards[0].offsetWidth + 24; // gap
  track.style.transform = `translateX(-${slideIndex * cardWidth}px)`;

  document.querySelectorAll('.dot-indicator').forEach((d, i) => {
    d.classList.toggle('active', i === slideIndex);
  });
}

function slideReviews(dir) {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  const cards   = track.querySelectorAll('.review');
  const visible = window.innerWidth < 900 ? 1 : 2;
  const max     = Math.max(0, cards.length - visible);

  let next = slideIndex + dir;
  if (next < 0)    next = max;
  if (next > max)  next = 0;
  goToSlide(next);
  resetAutoSlide();
}

function startAutoSlide() {
  slideInterval = setInterval(() => slideReviews(1), 4000);
}

function resetAutoSlide() {
  clearInterval(slideInterval);
  startAutoSlide();
}

// Load live reviews from DB into slider
async function loadReviews() {
  try {
    const res  = await fetch(`${API_BASE}/reviews`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      const track = document.getElementById('reviewsTrack');
      if (!track) return;
      track.innerHTML = data.data.map(r => `
        <div class="review">
          <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <p>"${escHtml(r.comment)}"</p>
          <div class="who">— ${escHtml(r.name)}${r.design_type ? ' · ' + escHtml(r.design_type) : ''}</div>
        </div>`).join('');
    }
  } catch(e) {
    // fallback static reviews remain
  }
  initSlider();
}

// Init slider on load (even with static reviews)
document.addEventListener('DOMContentLoaded', () => {
  initSlider();
  window.addEventListener('resize', () => goToSlide(slideIndex));
});