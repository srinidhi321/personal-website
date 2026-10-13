# Personal website

A personal site arranged as a Rubik's Cube. You stand inside it: the six
pages are six walls around a small cube. Turn the cube to change pages;
twist a layer and the pages scramble; Solve puts them back.

Plain HTML, CSS and JavaScript with Three.js from a CDN. No build step.

- `index.html` — page structure
- `content.js` — all the text (six pages, eight tiles each)
- `app.js` — the cube model, the 3D scene and the controls
- `styles.css` — styling

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. Opening `index.html` directly also works.
