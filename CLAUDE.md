# Kids' iPad Hub

A static, offline-capable PWA "home screen" for a kid's iPad. It hosts any number of self-contained
apps (games, stories, tools). Math games are the first content, but the hub is content-neutral.

## Tech stack
- Vanilla HTML/CSS/ES modules. No build step, no dependencies, no third-party scripts.
- Static hosting (GitHub Pages target). **All paths must be relative** so it works under a subpath.
- Service worker (`sw.js`): network-first with a 3s timeout and cache fallback, so updates arrive on the next
  launch when online, and everything works offline.
  It fetches with `cache: 'no-cache'` because GitHub Pages sends `max-age=600` (otherwise updates lag ~10 min).
- iOS resumes home-screen apps rather than reloading them, so `hub.js` reloads itself when it comes back after
  30+ s away (only while no app is open), or when leaving an app after the hub has been up 30+ min.

## Layout
- `index.html`, `hub.js`, `hub.css`: the launcher. Apps open in a full-screen iframe and the hub owns the home button.
- `apps.json`: hub title, version, and the ordered list of app folder ids.
- `apps/<id>/app.json`: `{ title, icon (emoji), color, entry = "index.html", files = [] }`.
  `files` lists extra assets to precache for offline use.
- `shared/base.css`: touch-first baseline (no zoom, selection or long-press menus) for the hub and apps.
- `shared/store.js`: per-device storage (`store.forApp(id)`: `stars/addStars/get/set`, plus `store.settings`).
  Stars are optional; the hub shows counts only when an app awards them.
- `scripts/make_icons.py`: regenerates placeholder PNG icons (iOS needs PNG for apple-touch-icon).

## Adding an app
1. Create `apps/<id>/index.html` + `apps/<id>/app.json`. Any self-contained HTML page works unmodified.
2. Add `<id>` to `apps.json`.
3. Optionally import `../../shared/base.css` and `../../shared/store.js`. To exit from inside an app:
   `parent.postMessage({ type: 'hub:exit' }, '*')`.

## Deploy
- Public repo `kunertgraf/mathcraft`; GitHub Pages serves `main` at https://kunertgraf.github.io/mathcraft/
- Pushing to `main` deploys automatically (about a minute). The iPad picks up changes on its next online launch.

## Apps
- `apps/fractions/` — **Pip's Mine**, the fractions game (design: `docs/fractions-game-design.md`).
  Canvas game at a fixed 1024×768 logical resolution (`js/stage.js`), scenes `camp.js` / `mission.js`,
  step types in `steps.js` (Place, Cut, Fill, Compare), blueprints (bridge/tower/track) in `blueprints.js`,
  base building `build.js` + `base.js`, night defence `night.js`, mastery + step generation + rewards in `learn.js`.
  Fractions are integers over 24ths (`DEN_LCM`) for exact arithmetic.
- `apps/recipes/` — **Cook Along**, step-by-step kid recipes. All content lives in `recipes.js` (plain data:
  tools, ingredients with numeric `qty` + `cup`/`tsp` units, steps with optional `uses`, `grownup`, `timer`), so a
  new recipe is just a new entry. The app draws measuring cups/spoons for each amount (1 ½ cups → 1 cup + ½ cup),
  saves progress and running timers (resume within 12 h), and keeps the screen awake while cooking.
  `?test` exposes `window.__cook`. Rewrite recipe steps in our own kid-friendly words; don't copy source text.
- `apps/times/` — **Times Tables**, 1990s timed worksheets (Mad Minute 30/1 min, Big 100/5 min, each table 2s–12s
  30/1 min, and "Fix My Mistakes" built from missed facts). On-screen keypad, LCD stopwatch, red-pen grading,
  personal bests, bronze/silver/gold per sheet, and a 20-sticker achievement book. Logic in `tests.js`, UI in `app.js`.
  `?test` exposes `window.__times` (`setLeft(sec)` jumps the clock).
- `apps/demo/` — minimal example of the app contract (not listed in `apps.json`).
- Shared pixel-art kit: `shared/art/` (palette, procedural textures, sprites/font, render helpers).
  Preview everything at `tools/artlab/`.

## Testing the game
- Open `apps/fractions/?test` to expose `window.__game` and `window.__advance(seconds)`, which steps the game
  deterministically (browsers pause animation frames in hidden/background tabs, so don't rely on real time).
- Drive input by dispatching PointerEvents on the canvas at `stage.ox + x * stage.scale` (logical → client).

## Commands
- Run locally: `python3 -m http.server 8931 --bind 127.0.0.1`, then open http://127.0.0.1:8931/
- Regenerate icons: `python3 scripts/make_icons.py`
- After changing the shell file list in `sw.js`, bump `CACHE` there. Bump `version` in `apps.json` on releases.

## Notes
- The home-screen name comes from static `<meta apple-mobile-web-app-title>` and `manifest.webmanifest`,
  not `apps.json`. Rename in all three places.
- **Never load anything from another site** (fonts, CDNs, analytics, external links). The iPad may use a Screen Time
  "Only Allowed Websites" allowlist containing just the hub's address, so external resources would silently fail.
- Grown-up settings open by holding the bottom-right gear for 3 seconds.
