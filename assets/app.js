// First-touch attribution — captured once per visit (kept up to 90 days),
// never overwritten by later navigation. This is what lets a prospect who
// clicks a cold-email link to /seo/?utm_source=cold_email&utm_campaign=...,
// browses around, then submits the contact form two pages later still
// attribute correctly to SEO / cold_email / that campaign.
(function captureFirstTouch() {
  const STORAGE_KEY = 'ev_first_touch';
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

  const SERVICE_BY_PATH = {
    '/google-ads/': 'Google Ads',
    '/seo/': 'SEO',
    '/ai-search-visibility/': 'AI Search Visibility',
    '/web-design/': 'Web Design',
    '/google-business-profile/': 'Google Business Profile',
    '/email-marketing/': 'Email Marketing',
    '/lead-automation/': 'Lead Automation',
  };

  function deriveSource(utm, gclid, referrer) {
    const src = (utm.utm_source || '').toLowerCase();
    const medium = (utm.utm_medium || '').toLowerCase();
    if (medium === 'email' || src.includes('cold_email') || src.includes('cold-email')) return 'Cold Email';
    if (gclid || (src.includes('google') && (medium === 'cpc' || medium === 'ppc'))) return 'Google Ads';
    let refHost = '';
    try { refHost = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch (e) { /* malformed referrer, ignore */ }
    const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
    const socialSites = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com'];
    if (!refHost && !src) return 'Direct';
    if (!src && searchEngines.some((h) => refHost.includes(h))) return 'Organic Search';
    if (socialSites.some((h) => refHost.includes(h))) return 'Social';
    if (refHost && refHost !== location.hostname) return 'Referral';
    return 'Other';
  }

  let existing = null;
  try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { /* storage unavailable */ }
  if (existing && existing.first_touch_at && Date.now() - existing.first_touch_at < MAX_AGE_MS) return;

  const params = new URLSearchParams(location.search);
  const utm = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  };
  const gclid = params.get('gclid') || '';
  const referrer = document.referrer || '';
  const bundle = Object.assign(
    { landing_page: location.pathname, referrer, gclid },
    utm,
    {
      service: SERVICE_BY_PATH[location.pathname] || '',
      source: deriveSource(utm, gclid, referrer),
      first_touch_at: Date.now(),
    }
  );
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle)); } catch (e) { /* storage unavailable — attribution degrades to blank, not fatal */ }
})();

// Scroll-reveal — fades/rises elements marked [data-reveal] into view.
// Skips entirely for prefers-reduced-motion (CSS already shows them fully visible).
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

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

// Contact form — primary path posts the standardized lead object straight to
// HubSpot's Forms Submission API (https://api.hsforms.com/...), which keeps
// our own custom-styled form (no HubSpot embed/iframe) while still getting
// HubSpot's native contact create-or-update-by-email (dedup), the form's
// configured owner notification, and its configured autoresponder.
//
// If that call fails for any reason (HubSpot down, portal/form not wired up
// yet), we fall back to FormSubmit.co — a zero-backend email relay — so the
// lead is never silently lost. The fallback email is clearly flagged
// "[CRM FALLBACK]" because, unlike the primary path, it does NOT create a
// HubSpot record by itself; recovering it into HubSpot is a manual step.
const LEAD_EMAIL = 'consult@evianads.com';

// Every one of these must exist as a field on the HubSpot form referenced by
// data-hs-form-guid below — HubSpot's Forms API rejects fields the form
// wasn't configured to accept. See the setup notes for the exact list.
const HUBSPOT_FIELDS = [
  'firstname', 'lastname', 'company', 'email', 'phone', 'website',
  'primary_service_interest', 'message', 'first_touch_service',
  'lead_source_detail', 'landing_page', 'referrer',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid',
];

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function getFirstTouch() {
  try {
    return JSON.parse(localStorage.getItem('ev_first_touch') || 'null') || {};
  } catch (e) {
    return {};
  }
}

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const errorEl = document.getElementById('contact-error');
  const submitLabel = submitBtn.textContent;

  // Pre-select "What are you interested in?" from the first-touch service so
  // someone who clicked through from the SEO page doesn't have to re-tell us
  // that. It's just a starting value — the prospect can still change it, and
  // whatever they submit is the standalone "Primary Service Interest" field,
  // kept separate from the untouched "First-Touch Service" attribution.
  const firstTouchOnLoad = getFirstTouch();
  if (firstTouchOnLoad.service) {
    const interestSelect = contactForm.elements.interest;
    const hasOption = [...interestSelect.options].some((opt) => opt.value === firstTouchOnLoad.service);
    if (hasOption) interestSelect.value = firstTouchOnLoad.service;
  }

  let isSubmitting = false;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Duplicate-submit guard — checked first and set synchronously, so even
    // several submit events fired back-to-back in the same tick (rapid
    // double-clicks, a stray double form-submit) only ever run this once.
    // Disabling the button below is the second, belt-and-suspenders layer.
    if (isSubmitting || submitBtn.disabled) return;
    isSubmitting = true;

    // Honeypot: bots fill every field, real users never see this one.
    if (contactForm.elements._honey.value) { isSubmitting = false; return; }

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const firstTouch = getFirstTouch();
    const firstname = contactForm.elements.firstname.value.trim();
    const lastname = contactForm.elements.lastname.value.trim();
    const email = contactForm.elements.email.value.trim();
    const phone = contactForm.elements.phone.value.trim();
    const company = contactForm.elements.company.value.trim();
    const website = contactForm.elements.site.value.trim();
    const primaryServiceInterest = contactForm.elements.interest.value;
    const message = contactForm.elements.message.value.trim();

    // Standardized lead object — same field names regardless of which page
    // the visitor arrived through, and regardless of which delivery path
    // (HubSpot or the FormSubmit fallback) ends up sending it.
    const lead = {
      firstname,
      lastname,
      company,
      email,
      phone,
      website,
      primary_service_interest: primaryServiceInterest,
      message,
      first_touch_service: firstTouch.service || 'Not Sure',
      lead_source_detail: firstTouch.source || 'Other',
      landing_page: firstTouch.landing_page || location.pathname,
      referrer: firstTouch.referrer || '',
      utm_source: firstTouch.utm_source || '',
      utm_medium: firstTouch.utm_medium || '',
      utm_campaign: firstTouch.utm_campaign || '',
      utm_content: firstTouch.utm_content || '',
      utm_term: firstTouch.utm_term || '',
      gclid: firstTouch.gclid || '',
      submitted_at: new Date().toISOString(),
    };

    const hsPortalId = contactForm.dataset.hsPortalId || '';
    const hsFormGuid = contactForm.dataset.hsFormGuid || '';
    const hubspotConfigured = hsPortalId && hsFormGuid && !hsPortalId.startsWith('REPLACE') && !hsFormGuid.startsWith('REPLACE');
    let hubspotOk = false;

    if (hubspotConfigured) {
      try {
        const fields = HUBSPOT_FIELDS
          .map((name) => ({ name, value: lead[name] }))
          .filter((f) => f.value !== undefined && f.value !== null && f.value !== '');

        const res = await fetch(
          `https://api.hsforms.com/submissions/v3/integration/submit/${hsPortalId}/${hsFormGuid}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields,
              context: {
                hutk: readCookie('hubspotutk') || undefined,
                pageUri: location.href,
                pageName: document.title,
              },
            }),
          }
        );
        if (!res.ok) throw new Error(`HubSpot responded ${res.status}`);
        hubspotOk = true;
      } catch (err) {
        // Never surface this to the prospect — just fall through to the email fallback below.
        console.error('HubSpot form submission failed, falling back to email:', err);
      }
    } else {
      console.error('HubSpot not configured yet (data-hs-portal-id/data-hs-form-guid still placeholders) — using email fallback.');
    }

    if (!hubspotOk) {
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${LEAD_EMAIL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.assign({}, lead, {
            name: `${firstname} ${lastname}`.trim(),
            _subject: '[CRM FALLBACK] New Evianads Lead',
            _template: 'table',
            _autoresponse:
              `Hi ${firstname || 'there'},\n\nThanks for reaching out to Evianads — this confirms your message came through. `
              + `I'll reply to ${email} within one working day with next steps.\n\n— Evianads`,
          })),
        });
        if (!res.ok) throw new Error(`FormSubmit responded ${res.status}`);
      } catch (fallbackErr) {
        console.error('FormSubmit fallback also failed — lead was not delivered:', fallbackErr);
        errorEl.textContent = `Something went wrong sending this. Please email ${LEAD_EMAIL} directly.`;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
        isSubmitting = false;
        return;
      }
    }

    document.getElementById('confirm-name').textContent = firstname || 'there';
    document.getElementById('confirm-email').textContent = email || 'your inbox';
    contactForm.classList.add('hidden');
    document.getElementById('contact-confirm').classList.remove('hidden');
  });
}
