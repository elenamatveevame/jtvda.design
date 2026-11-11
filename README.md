# jtvda.design

Personal site of Jeroen Thys van den Audenaerde, interior and furniture designer in Antwerp.
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
| `main.js` | Loader, live Antwerp clock, cursor, scroll scenes, hover on the pieces |
| `*.webp` | Images, next to `index.html` in the root |

## The page, top to bottom

1. **Entrance.** The name in large type. A small Klein-blue square grows on scroll until it fills the screen, and the black Judd table floats in the blue.
2. **01 Selected work.** Five pieces scattered on a light field. They stay grey and blurred until you point at one, then the name appears below in large type.
3. **In the air.** The blue glass dining table comes closer as you scroll.
4. **02 In situ.** Nine photographs from the stone yard, the workshop and rooms, scattered on black.
5. **03 About.** Profile, current role at Cockaert, Galerie Philia, practice.
6. **04 Contact.** Email and Instagram on a full Klein-blue field.

## Editing

- **Text:** edit it in `index.html`.
- **A piece in "Selected work":** each one is a `<button class="piece">`. Its `--x`, `--y` and `--w` set the position and width on a computer. `--xm`, `--ym` and `--wm` do the same on a phone. `data-name` and `data-detail` are the caption.
- **A photo in "In situ":** each one is a `<figure class="shot">`, positioned the same way.
- **The blue:** change `--ikb` at the top of `style.css`.

## Image sources (check before going public)

| Images | Source |
| --- | --- |
| `chair`, `bluetable`, `sidetable`, `judd` | Cut out of 1stDibs listing photos |
| `jeroen-bw` | Team page of cockaert.be |
| `situ-01` … `situ-09`, `arch-glass` | Instagram @barh.design |

Swap these for Jeroen's original files, or confirm the rights, before the site goes live.
