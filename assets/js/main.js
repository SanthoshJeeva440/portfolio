/* ==========================================================================
   Santhosh G. — Portfolio behaviour
   Edit SITE_CONFIG to publish contact details, the resume, and the contact
   form. Anything left empty stays hidden, so no placeholder text is ever
   shown to visitors.
   ========================================================================== */

const SITE_CONFIG = {
  // Professional email, e.g. 'name@example.com'. Empty = email link hidden.
  email: '',
  // Phone in international format, e.g. '+91 90000 00000'. Empty = hidden.
  phone: '',
  // Path to the resume PDF committed to this repo. Empty = "coming soon" state.
  resumeUrl: '', // e.g. 'assets/resume/Santhosh-G-Resume.pdf'
  // Form endpoint that accepts a POST with JSON (e.g. a Formspree form URL
  // such as 'https://formspree.io/f/xxxxxxxx'). Empty = form hidden.
  formEndpoint: '',
};

document.documentElement.classList.add('js');

/* ---------- Header + mobile navigation ---------- */
const header = document.querySelector('.site-header');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

function setNavOpen(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navLinks.classList.toggle('open', open);
}

navToggle.addEventListener('click', () => {
  setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
});
navLinks.addEventListener('click', (e) => {
  if (e.target.closest('a')) setNavOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    setNavOpen(false);
    navToggle.focus();
  }
});

const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Active section highlighting ---------- */
const navAnchors = [...navLinks.querySelectorAll('a[href^="#"]')];
const sections = navAnchors
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach((a) => {
        const match = a.getAttribute('href') === `#${entry.target.id}`;
        if (match) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
}

/* ---------- Project filter ---------- */
const filterButtons = document.querySelectorAll('[data-filter]');
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('.project').forEach((p) => {
      p.hidden = value !== 'all' && p.dataset.kind !== value;
    });
  });
});

/* ---------- Resume ---------- */
document.querySelectorAll('[data-resume]').forEach((el) => {
  if (SITE_CONFIG.resumeUrl) {
    el.setAttribute('href', SITE_CONFIG.resumeUrl);
    el.setAttribute('download', '');
    el.removeAttribute('aria-disabled');
    el.removeAttribute('title');
    const label = el.querySelector('[data-resume-label]');
    if (label) label.textContent = 'Download Resume';
  } else if (el.getAttribute('aria-disabled') === 'true') {
    el.addEventListener('click', (e) => e.preventDefault());
  }
});
const resumeStatus = document.getElementById('resume-status');
if (resumeStatus && SITE_CONFIG.resumeUrl) resumeStatus.hidden = true;

/* ---------- Contact details ---------- */
const emailLink = document.getElementById('contact-email');
if (SITE_CONFIG.email) {
  emailLink.href = `mailto:${SITE_CONFIG.email}`;
  emailLink.querySelector('strong').textContent = SITE_CONFIG.email;
  emailLink.hidden = false;
}
const phoneLink = document.getElementById('contact-phone');
if (SITE_CONFIG.phone) {
  phoneLink.href = `tel:${SITE_CONFIG.phone.replace(/[^+\d]/g, '')}`;
  phoneLink.querySelector('strong').textContent = SITE_CONFIG.phone;
  phoneLink.hidden = false;
}

/* ---------- Contact form ----------
   Only shown when a real endpoint is configured. Success is reported only
   when the endpoint returns a 2xx response. */
const form = document.getElementById('contact-form');
if (SITE_CONFIG.formEndpoint) {
  form.hidden = false;
  document.querySelector('.contact-grid').classList.remove('single');
  const status = document.getElementById('form-status');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data._gotcha) return; // honeypot filled: silently drop bots

    submit.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Sending…';
    try {
      const res = await fetch(SITE_CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      status.classList.add('ok');
      status.textContent = 'Thanks, your message was delivered.';
    } catch (err) {
      status.classList.add('err');
      status.textContent = 'Sorry, the message could not be sent. Please reach out on LinkedIn instead.';
    } finally {
      submit.disabled = false;
    }
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
