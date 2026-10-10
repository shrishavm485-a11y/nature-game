# Serenity
A peaceful 3D nature-exploration game (Three.js + Vite). Walk, cycle or drive through a lake, waterfall forest, village, coast and flower meadow. No enemies, no goals, no backend. All art is procedural and all sound is synthesized with Web Audio, so there are no external assets or licences to track.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview
```
## Deploy to GitHub Pages
1. Push to a GitHub repo's `main` branch.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. `.github/workflows/deploy.yml` builds and publishes. `vite.config.js` uses `base: './'`, so it works under `/repo-name/`.
4. Open `https://<user>.github.io/<repo>/` on your phone and rotate to landscape.

## Controls
Desktop: WASD/arrows, mouse (click to capture), Shift run, E enter/exit vehicle or sit on a bench, C camera, Esc menu.
Touch: left stick, drag right side to look, on-screen buttons per mode.
Settings (time, weather, season, quality, volumes) and discoveries save to localStorage.

## Not yet built
Rivers/streams, bamboo/tropical trees, map, postcards, cabin interior, railway crossing, bridges, fishing dock props, campfire crackle, rain ripples, free camera.
