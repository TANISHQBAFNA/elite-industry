# Elite Industry

Static HTML marketing site for industrial equipment. Circa-2020 Bootstrap 4 page:
`index.html` plus `assets/css`, `assets/img`, `assets/js`. **Zero build.** CSS and
JS stay classic `<link>` / `<script>` tags. Visual redesign is out of scope
(Iris owns UI later).

## Run it locally

From the repo root:

```bash
python3 -m http.server 4321
```

Same thing via npm (no install needed — scripts call Python and Node):

```bash
npm run dev      # python3 -m http.server 4321
npm test         # smoke: index.html, asset paths, classic tags, no bundler
```

Then open <http://localhost:4321>. Opening `index.html` by double-click also
works — local scripts are classic (non-module) files.

Bootstrap, jQuery, and Font Awesome still load from cdnjs. A full visual
preview needs network; the smoke check only asserts local files.

| URL | Page |
| --- | --- |
| `/` or `/index.html` | Marketing home (`index.html`) |

### Toolchain (conservative)

- `package.json` with `dev` / `start` / `test` / `check` only. No bundler.
- **Skipped Vite and Webpack.** Either would change how this HTML loads CSS/JS
  (`type=module`, `/@vite/client`, hashed assets). That is not zero-risk for a
  classic static page.
- No runtime npm dependencies. Local CSS/JS are not rewritten.
- Guard: `npm test` runs `scripts/check-site.js`.

## GitHub Pages

Structure already fits. `index.html` sits at the repo root, so GitHub Pages
**Deploy from a branch → `/` (root)** works as-is. No `docs/` folder and no
build step.

## Files

| File | Role |
| --- | --- |
| `index.html` | Single-page marketing layout |
| `assets/css/styles.min.css` | Site styles (loaded via `<link>`) |
| `assets/js/script.min.js` | Site scripts (loaded via `<script src>`) |
| `assets/img/` | Brand, carousel, and product images |
| `scripts/check-site.js` | Smoke check used by `npm test` |
