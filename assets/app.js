// Mobile nav toggle.
const navToggle = document.querySelector('.nav-toggle');
const siteHeaderEl = document.querySelector('.site-header');
if (navToggle && siteHeaderEl) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteHeaderEl.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// "Services" nav dropdown — click to toggle (works for touch and desktop),
// closes on an outside click.
document.querySelectorAll('.nav-dropdown-toggle').forEach((toggle) => {
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = toggle.closest('.nav-item-dropdown');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.nav-item-dropdown.open').forEach((el) => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-item-dropdown.open').forEach((el) => el.classList.remove('open'));
});

// FAQ accordion — one open item at a time.
document.querySelectorAll('.faq-item').forEach((item) => {
  const btn = item.querySelector('.faq-q');
  const sign = item.querySelector('.faq-sign');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((open) => {
      open.classList.remove('open');
      open.querySelector('.faq-sign').textContent = '+';
      open.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      sign.textContent = '−';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Contact form — sends real leads via FormSubmit (formsubmit.co), a
// zero-backend form-relay service: no signup, no API key, no server code.
// The first submission ever sent to LEAD_EMAIL triggers a one-time
// confirmation email from FormSubmit that must be clicked to activate
// delivery — see SETUP.md.
const LEAD_EMAIL = 'consult@evianads.com';

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const errorEl = document.getElementById('contact-error');
  const submitLabel = submitBtn.textContent;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: bots fill every field, real users never see this one.
    if (contactForm.elements._honey.value) return;

    const name = contactForm.elements.name.value.trim();
    const email = contactForm.elements.email.value.trim();

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          email,
          website: contactForm.elements.site.value.trim(),
          interested_in: contactForm.elements.interest.value,
          message: contactForm.elements.message.value.trim(),
          _subject: 'New lead — Evianads consultation request',
          _template: 'table',
        }),
      });

      if (!res.ok) throw new Error();

      document.getElementById('confirm-name').textContent = name.split(' ')[0] || 'there';
      document.getElementById('confirm-email').textContent = email || 'your inbox';
      contactForm.classList.add('hidden');
      document.getElementById('contact-confirm').classList.remove('hidden');
    } catch {
      errorEl.textContent = `Something went wrong sending this. Please email ${LEAD_EMAIL} directly.`;
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
}
