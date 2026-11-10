# عبود في ليوا · Abood in Liwa

سفاري الكثبان في المتصفح: عبود بالكندورة والشماغ الأحمر يسوق البقي بحرية في رمال ليوا. ما في طريق: المحمية دائرة مفتوحة من الرمل، تسوق وين ما تبا، تطلع التلال، تطير من فوق القمم، وتجمع التمر قبل لا يخلص البترول.

A free-roam dune safari for the browser, and a sister game to *Run, Abood!* and *Abood to the Moon*. Abood drives his dune buggy across a round, open reserve of Liwa sand. There is no track: drive anywhere, climb the dunes, fly off the crests, and collect dates before the fuel runs out. Arabic is the default language. The flag buttons switch to English.

## How to play

- **Touch:** put a finger anywhere and drag the way you want to go. Drag further to go faster.
- **Keyboard:** arrow keys or WASD. Up accelerates, down brakes and reverses, left and right steer. P or Esc pauses.
- **Dunes** have a gentle windward side and a steep slip face. Build speed up the gentle side and the buggy takes off at the crest.
- **Rolling:** driving across a steep slope, or landing sideways, rolls the buggy. It tumbles downhill, costs fuel, and Baba has something to say.
- **Dates** turn into dirhams at the end of the run. A **red jerrycan** tops up the fuel.
- **The run ends** when the fuel runs out.

## The map

The reserve is a circle 6.8 km of pixels across, ringed by red flags. A round map sits in the top corner during a run (tap it for the big map): it shows the dunes, the buggy as a red arrow, jerrycans as red dots, and the 11 places. The first visit to a place gives its postcard and dirhams.

| Place | What is there |
|---|---|
| The camp | Black tent, sadu rug, coffee fire, Baba. Every run starts here |
| Tal Moreeb | The one giant dune, with a chequered flag on the summit |
| Liwa Oasis | A pool ringed by date palms |
| Liwa Fort | Mud-brick fort with a round tower and a teal door |
| Camel caravan | Five camels round a water trough |
| Arabian oryx | Three oryx under a ghaf tree |
| Falcon perch | A hooded falcon on its block |
| The old well | Stone well with a bucket |
| The salt flat | A pale, flat sabkha: the fastest ground on the map |
| Date festival | A stall of date baskets |
| Empty Quarter gate | The sign at the southern rim |

Camels and oryx wander near home and trot away from a fast buggy.

## Economy

In-game dirhams only; there are no real payments. Progress is saved on the device.

- **End of run:** 10 dates = 1 dirham, plus 1 per 250 m driven, plus 1 per second in the air.
- **Postcards:** 10 to 58 dirhams each, once, more for places far from the camp.
- **Garage:** five buggy colours (red is free; 150, 300, 500, 1,000) and three bigger-tank levels (200, 500, 1,000), each adding 15% fuel.

## How it is built

A small canvas game with no image files. Everything on screen is drawn in code.

- **One height function.** `H(x, y)` in `js/game.js` gives the ground height anywhere: two sets of wind-shaped ridges, some noise, one big bump for Tal Moreeb, flat ground round each place, and a raised rim. The picture and the physics both read it, so what looks steep is steep.
- **Ground:** the sand is shaded from the slope of `H` into 256 px tiles, baked the first time they are needed and kept in a cache of 150. After that a frame copies about 15 images.
- **Driving:** the engine pushes along the buggy's heading, the slope pulls it downhill, the tyres only half hold sideways. When the ground falls away faster than gravity the buggy is in the air. Constants are at the top of the *state* section.
- **Sprites:** Abood, Baba, the buggy, animals and landmarks are drawn once with canvas paths into cached sprites.
- **Sound:** ZzFX effects built at load time, a Hijaz-scale tune with a maqsum beat, and an engine hum from one oscillator.
- **Phones:** lower render resolution to start with, dropped further if frames run slow; 60 fps cap in a run and 30 behind menus; HUD written only when a value changes; screen kept awake; pauses when the app is hidden.
- **Size:** about 120 KB of code and 430 KB in total, most of it the font.

## Ads hook

No ad code is included. As in the sister games, define this to show something after each run:

```js
window.aboodAfterRun = async ({ distance, dates }) => { /* the results card appears when this settles, or after 15 s */ };
```

## Run it locally

Any static file server works (the service worker needs `http://localhost` or HTTPS):

```bash
python3 -m http.server 8000
```

## Publish on GitHub Pages

Every push to `main` runs `.github/workflows/pages.yml`, which stamps the commit id into `__BUILD__` (cache name and asset URLs) and publishes to the `gh-pages` branch. If the site does not appear after the first deploy, open **Settings → Pages** and set **Source** to **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**. The game is then at `https://<user>.github.io/Abood-Liwa/`.

## Project layout

```
index.html              page, loading screen, menus
css/style.css           layout, RTL, phone breakpoints, self-hosted font faces
js/game.js              the game: terrain, driving, drawing, map, sound, menus, loader
js/i18n.js              Arabic and English text, language switch
js/vendor/zzfx.js       ZzFX sound synth (MIT)
assets/fonts/           Baloo Bhaijaan 2 (SIL OFL 1.1)
assets/icons/           app icons, generated from the game's own drawing of Abood
sw.js                   offline cache
manifest.webmanifest    install settings
.github/workflows/      GitHub Pages deploy
```

See [CREDITS.md](CREDITS.md) for third-party licences.
