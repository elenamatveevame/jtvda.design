# jtvda.design

Personal site of Jeroen Thys van den Audenaerde, interior and furniture designer in Mechelen.
Black, a lot of empty space, and one colour: International Klein Blue (`#002fa7`).

Plain HTML, CSS and JavaScript. No build step and no dependencies apart from two Google Fonts
(Instrument Serif, Inter Tight).

## Run it locally

```bash
python3 -m http.server 8771
```

Then open http://localhost:8771. Opening `index.html` straight from the disk works too.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, go to Settings → Pages → Build and deployment.
3. Pick "Deploy from a branch", then `main` and `/ (root)`.

`.nojekyll` makes GitHub serve the files as they are.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All the content: the sections, texts, pieces and photos |
| `style.css` | Colours, type, layout, animation |
| `main.js` | Loader, live Mechelen clock, cursor, scroll scenes, hover on the pieces |
| `*.webp` | Images, next to `index.html` in the root |

## The page, top to bottom

The whole page is black. The only colour is International Klein Blue.

1. **Entrance.** The name in large type. A small Klein-blue square grows on scroll until it fills the screen, and the black Judd table floats in the blue.
2. **Selected work.** Three pieces float on black (01–03), then five black-and-white photographs (04–08). A click opens any of them full screen, in colour.
3. **About.** Portrait, a short profile, current role at Cockaert, Galerie Philia.
4. **Contact.** Email and Instagram on a full Klein-blue screen.

## Editing

- **Text:** edit it in `index.html`.
- **A piece or a photo:** each one is a `<button class="item">`. Its `--x`, `--y` and `--w` set the position and width on a computer. `--xm`, `--ym` and `--wm` do the same on a phone. `data-name` and `data-detail` are shown in the full-screen viewer.
- **The blue:** change `--ikb` at the top of `style.css`.
- After changing `style.css` or `main.js`, raise the `?v=` number on their links in `index.html` so browsers fetch the new file.

## Image sources (check before going public)

| Images | Source |
| --- | --- |
| `chair`, `bluetable`, `sidetable`, `judd` | Cut out of 1stDibs listing photos |
| `jeroen-bw` | Team page of cockaert.be |
| `situ-01` … `situ-09`, `arch-glass` | Instagram @barh.design |

Swap these for Jeroen's original files, or confirm the rights, before the site goes live.
