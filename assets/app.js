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

// CCed on every submission so it also arrives as a text message, via the
// carrier's email-to-SMS gateway (T-Mobile: <number>@tmomail.net). Like
// LEAD_EMAIL, this address needs its own one-time FormSubmit activation
// click on first use — see SETUP.md.
const LEAD_SMS_GATEWAY = '8327637553@tmomail.net';

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
          monthly_ad_spend: contactForm.elements.spend.value,
          message: contactForm.elements.message.value.trim(),
          _subject: 'New lead — Evianads free audit request',
          _template: 'table',
          _cc: LEAD_SMS_GATEWAY,
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
