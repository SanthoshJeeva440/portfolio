# Santhosh G. — QA Automation Portfolio

Personal portfolio for a Senior QA Automation Engineer. Plain HTML, CSS, and
JavaScript: no framework, no build step, deployable as-is to GitHub Pages.

## Structure

```
index.html                  All page content (sections, projects, icon sprite at the end)
assets/css/styles.css       Styles: design tokens at the top, then components
assets/js/main.js           Navigation, project filter, and SITE_CONFIG (contact, resume, form)
assets/img/                 Favicon, social preview image, project screenshots
assets/resume/              Put the resume PDF here
tests/smoke.mjs             Playwright smoke test (links, icons, layout, contact/resume state)
.github/workflows/pages.yml Runs the smoke test, then deploys to GitHub Pages
.nojekyll                   Tells GitHub Pages to serve files as-is
```

## Run locally

Any static server works. From the repo root:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Configure contact details, resume, and form

Open `assets/js/main.js` and fill in `SITE_CONFIG`. Anything left empty stays
hidden on the site, so no placeholder text is ever shown to visitors.

| Setting        | Effect when set                                                                  |
| -------------- | -------------------------------------------------------------------------------- |
| `email`        | Shows a `mailto:` link in Contact                                                |
| `phone`        | Shows a `tel:` link in Contact                                                   |
| `resumeUrl`    | Turns both Resume buttons into real downloads (commit the PDF in `assets/resume/`) |
| `formEndpoint` | Shows the contact form and POSTs to that URL                                      |

**Contact form:** create a free form at [Formspree](https://formspree.io), copy
its endpoint (`https://formspree.io/f/xxxxxxxx`), and paste it into
`formEndpoint`. The form only shows a success message when the endpoint
returns a 2xx response; otherwise it tells the visitor to use LinkedIn.

## Edit content

- **Experience:** `index.html` has a commented role template inside
  `#experience`. Copy it once per verified role, newest first.
- **Certifications / education:** a commented card template sits inside
  `#achievements`.
- **Skills:** each skill is one `<li class="skill">`. The green "Public code"
  chip marks tools that appear in public GitHub repositories; keep that honest.
- **Social preview:** after deploying, change `og:image` in `<head>` to the
  absolute URL, e.g. `https://<your-domain>/assets/img/og-image.png`.

## Test

```bash
npm install --no-save playwright && npx playwright install chromium
node tests/smoke.mjs                    # all checks
node tests/smoke.mjs --screens shots    # also saves full-page screenshots
```

The same test runs in GitHub Actions before every deploy.

## Deploy to GitHub Pages

1. Copy these files into the root of the `portfolio` repository (replace the
   old `index.html` and `.github/workflows/jekyll-gh-pages.yml`; this package
   ships its own `.github/workflows/pages.yml`). Keep the existing `CNAME`
   file if you use a custom domain.
2. Commit and push to `main`.
3. In the repo on GitHub: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
4. Open the **Actions** tab and wait for "Deploy portfolio to GitHub Pages" to
   finish. The site URL is shown on the deploy job and in Settings → Pages.

Without a custom domain the site is served at
`https://santhoshjeeva440.github.io/portfolio/`. All paths in the site are
relative, so it works both there and on a custom domain.

**Custom domain:** keep a `CNAME` file containing only the domain, add the
DNS records GitHub lists under Settings → Pages, then tick **Enforce HTTPS**
once the certificate is issued.

## Credits

Technology icons: [Simple Icons](https://simpleicons.org) (CC0) and
[Devicon](https://devicon.dev) (MIT) for Playwright, C#, and Java. Trademarks
belong to their owners.
