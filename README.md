# Ridge Runner — Alpine Rescue Flight

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/bisnanjp01-spec/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/bisnanjp01-spec/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete, original 2D flight game that runs offline in a desktop browser from
static files. Fly the bush plane *Kestrel-7* through alpine valleys: thread the
glowing target rings, pick up supply crates, mind your fuel and damage, and put
her down on the mountain strip at the end of each mission.

Three missions, one valley, rising trouble: **Dawn Patrol** (learn the sky),
**Ridge Run** (tight rings, gusty wind) and **Storm Crossing** (dusk, hard gusts,
thin fuel). Every run is scored — rings, crates, landing quality and time — with
a best score kept on your machine.

## Play it

Serve `game/` with any static server and open it in desktop Chrome:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network requests, no assets to download: every sound is
synthesised with WebAudio and every pixel is drawn on canvas.

## Controls

| Key | What it does |
| --- | --- |
| ↑ / W | Pull up — climb |
| ↓ / S | Push down — descend |
| ← / → or A / D | Bank — turn, heading changes |
| Shift | Throttle up |
| Ctrl | Throttle down |
| Space | Flaps — extra lift, bleeds speed (for landing) |
| Mouse | Move to steer pitch, hold click for throttle, wheel for throttle |
| P | Pause |
| M | Mute |
| Enter | Start / continue |
| R | Restart the mission |

Land on the runway: slow, low, wings level, flaps out. Three hard hits on
rock, or an empty tank far from the strip, ends the sortie.

## How it is built

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with `buildDossier` from
  `vendor/makefun-game.ts`.
- `game/index.html` — the page: canvas, HUD and menu overlays.
- `game/style.css` — page and menu styling.
- `game/src/config.js` — tuning, missions, palette.
- `game/src/random.js` — seeded random numbers (deterministic terrain).
- `game/src/audio.js` — WebAudio sound engine: engine drone, wind, chimes.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/world.js` — valley, ridges, rings, crates, runway, birds, wind.
- `game/src/plane.js` — flight physics: lift, drag, throttle, damage, fuel.
- `game/src/particles.js` — exhaust, bursts, smoke, spray.
- `game/src/render.js` — canvas drawing: sky, terrain, plane, HUD, dials.
- `game/src/main.js` — game loop, states, scoring, missions.
- `screenshots/` — real renders of the game running in Chrome.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/game/`, `out/screenshots/` and `out/dossier.json` — the
hand-in the grader reads.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mellow-harbor-70&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
