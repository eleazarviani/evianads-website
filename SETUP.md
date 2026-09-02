# Build notes (implementation, not design)

This folder now contains two things:

- The original design handoff (`Evianads Landing v3.dc.html`, `README.md`, `logo.png`, `styles.css`) — kept as-is for reference.
- The actual site built from it: plain static HTML/CSS/JS. No build step, no backend, no dependencies.

## Structure

```
index.html                     Main landing page (design recreated 1:1)
404.html                       Custom not-found page
robots.txt                     Allows crawling, points to sitemap.xml
sitemap.xml                    Single-URL sitemap for https://evianads.com/
assets/design-system.css       Copy of the handoff's Modernist token file (unmodified)
assets/site.css                Page layout/styles, built on top of the tokens
assets/app.js                  FAQ accordion + lead form submission
assets/logo.png                Wordmark, used as favicon and in the header/footer
```

## Running it locally

Plain static files — open `index.html` directly in a browser, or serve the folder with any static file server, e.g.:

```bash
npx serve .
```

## Lead form

The contact form (`#contact`) sends real submissions via [FormSubmit](https://formsubmit.co) — a free form-relay service with no signup and no API key. It POSTs to `https://formsubmit.co/ajax/<your-email>`; the target email lives in one place, `LEAD_EMAIL` at the top of `assets/app.js`.

**One-time activation step (do this right after launch):** the very first submission ever sent to an email address triggers a confirmation email from FormSubmit to that address — someone has to click the link in it before FormSubmit will deliver any leads. Submit a real test through the live form and check `consult@evianads.com` (including spam) for that confirmation email before telling anyone the site is live.

A hidden `_honey` field is included as basic bot protection (FormSubmit silently discards submissions where it's filled in).

If you'd rather use a different provider (Formspree, Web3Forms, your own serverless function, etc.), only the `fetch(...)` call in `assets/app.js` needs to change — the form markup and UX stay the same.

## Deploying

This is pure static output, so any static host works: Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3 + CloudFront, etc. Drag-and-drop the folder or point the host at it — there's nothing to build.

`robots.txt`, `sitemap.xml`, and every meta/canonical/Open Graph tag in `index.html` assume the domain is **`evianads.com`**. If it launches on a different domain, update:
- `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image` in `index.html`
- the JSON-LD `url`/`logo` fields in `index.html`
- `robots.txt` (Sitemap line) and `sitemap.xml` (`<loc>`)

## Pre-launch checklist

- [x] Design recreated as real static HTML/CSS (no inline-style prototype code)
- [x] Lead form wired to actually send (FormSubmit) — do the one-time activation test above
- [x] SEO basics: title/description, canonical, Open Graph + Twitter card, JSON-LD business schema, robots.txt, sitemap.xml
- [x] Favicon (currently the wordmark logo — a dedicated square icon would render more cleanly at small sizes, but this works)
- [x] Custom 404 page
- [x] FAQ accordion is keyboard/screen-reader accessible (`aria-expanded`/`aria-controls`)
- [ ] **Hero image** is still the Unsplash stock placeholder from the handoff. Legally fine to ship (Unsplash's license permits commercial use) — but per the handoff notes, swap for a real (blurred) dashboard screenshot or workspace photo when you have one.
- [ ] **Case-study figures** (the $68 cost-per-quote, 5.9× ROAS, −54% cost-per-call numbers) are the handoff's illustrative placeholders, not verified client data. Replace with real, verifiable figures before publishing them as facts.
- [x] Footer/location mismatch resolved — footer now reads "© 2026 Evianads Consulting Firm" (dropped the conflicting "Registered in England" claim), contact section keeps "Based in Miami, FL."
