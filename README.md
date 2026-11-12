# عبود في ليوا · Abood in Liwa

سفاري الكثبان في المتصفح: عبود بالكندورة والشماغ الأحمر يسوق سيارته بحرية في رمال ليوا. ما في طريق: المحمية دائرة مفتوحة من الرمل، تسوق وين ما تبا، تطلع التلال، تطير من فوق القمم، وتجمع التمر قبل لا يخلص البترول.

A free-roam dune safari for the browser, and a sister game to *Run, Abood!* and *Abood to the Moon*. Abood drives his dune car across a round, open reserve of Liwa sand. There is no track: drive anywhere, climb the dunes, fly off the crests, and collect dates before the fuel runs out. Arabic is the default language. The flag buttons switch to English.

## How to play

- **Touch:** put a finger anywhere and drag the way you want to go. Two rings appear under it: inside the first, the further you drag the faster you go; out past the second is *pressing hard*, which slides the car and does tricks in the air (see Stunts). There are no buttons to find.
- **Keyboard:** arrow keys or WASD. Up accelerates, down brakes and reverses, left and right steer. P or Esc pauses.
- **Dunes** are real ones in cross-section: a long gentle windward ramp that is still climbing at the crest, a sharp crest that catches the light, and a short dark slip face. They all face downwind. Build speed up the ramp and the car flies off the crest; coming the other way, the car drops into low gear and crawls up the slip face, so a run-up or a climb at an angle is quicker. Only Tal Moreeb is too steep to crawl up; stall there and Baba says so.
- **Rolling:** driving across a steep slope, or landing sideways, rolls the car. It tumbles downhill, costs fuel, and Baba has something to say.
- **Dates** turn into dirhams at the end of the run. A **red jerrycan** tops up the fuel.
- **The run ends** when the fuel runs out.

## The map

The reserve is a circle 6.8 km of pixels across, ringed by red flags. A round map sits in the top corner during a run (tap it for the big map): it shows the dunes, the car as a red arrow, jerrycans as red dots, and the 11 places. The first visit to a place gives its postcard and dirhams.

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

Camels and oryx wander near home and trot away from a fast car.

## Stunts

Every stunt scores points, shown above the car. Fifty points are worth one dirham at the end of the run, and there are missions for each kind.

- **Drift:** at speed, press hard (drag past the second ring) into a sharp turn; keyboard: hold Space while steering. Pressing hard straight ahead is just driving, and a sharp turn inside the first ring grips, so a slide is always a choice. The back steps out with a kick, the car holds an angle of about fifty degrees with the nose ahead of the way it is going, throws sand sideways, ploughs darker marks, and keeps about three quarters of its speed. It ends when the car points where your finger is, and a good one ends with a shove forward. A short hop over a crest does not break it. Points grow with speed and angle. A full circle is a donut.
- **Two wheels:** a fast turn, or driving across a slope, lifts one side of the car. Hold it there for points. On level sand the car cannot go over from turning alone; on a slope it can. A drift sheds the tipping force, so sliding is the safe way round a fast corner.
- **Spins and flips:** in the air, press hard backwards for a backflip, or hard across the jump for a 360 spin; pressing hard forwards does nothing, so holding the throttle open over a crest is safe (keyboard: Space with left or right, Space with down, F for a front flip). Each trick is one full turn, paced to finish before landing, and only starts when the jump is long enough. Land on the wheels to bank it.
- **Combo:** land a stunt within about three seconds of the last one and it scores double, then triple, up to five times. The clock waits while a stunt is under way, a ×2 badge under the car shows what the next stunt is worth and how long is left, and rolling the car sends it back to the start. Points already scored are never taken back.

## Missions, levels and races

What keeps a run worth starting once every postcard is found:

- **Missions:** dealt at random from 32 kinds, three at a time, a fourth from level 4 and a fifth from level 8. The HUD shows the one you are closest to finishing. Each finished mission is replaced after the run, never by a kind you just had, and the set is spread over six categories: collecting (dates, dates in the first minute, jerrycans, dirhams earned), driving (distance, distance without rolling, top speed, distance from the camp), stunts (air time, one long jump, drift points, one big drift, donuts, two wheels in total and in one go, flips, spins, stunt points, combo), exploring (places visited, drive to a named place, reach one against the clock, a delivery between two places, the Tal Moreeb summit, find the sand gazelles), races (finish one, win a medal) and five that add up over several runs.
- **Harder with level:** targets grow with your level up to a cap; each mission is one, two or three stars, and three-star missions go from about 1 in 12 at level 1 to nearly half from level 14 (an easy one is set as if two levels lower, a hard one four higher, and pays half as much again); and from level 5 some carry a twist: do it without rolling. A mission you do not fancy can be swapped in the Missions sheet for a few dirhams. The table of kinds is `MK` in `js/game.js`.
- **Levels:** missions, postcards, races and every run give experience. Each level pays dirhams, unlocks races, and moves you up five ranks from Beginner to Desert falcon.
- **Races:** drive through places in order against the clock for bronze, silver and gold. Five fixed races unlock by level, and a race of the day changes daily. Fuel does not run down in a race. An arrow and a light beacon point to the next checkpoint, the map shows the route, and the ghost of your best run races you.
- **Daily gift:** dirhams for the first visit each day, growing over seven days in a row.
- **Upgrades:** engine, tyres, balance, tank and date basket, five levels each (100, 250, 500, 900, 1,500).

## Animals

Drawn from the real animals of the Liwa sands: the dromedary with its rope halter, the Arabian oryx (white coat, brown legs, black face stripes, long ringed horns), the Arabian sand gazelle or reem, which bolts when the car comes near, and a hooded hunting falcon on its block.

## Economy

In-game dirhams only; there are no real payments. Progress is saved on the device.

- **End of run:** 10 dates = 1 dirham, plus 1 per 250 m driven, plus 1 per 50 stunt points.
- **Postcards:** 10 to 58 dirhams each, once, more for places far from the camp.
- **Garage:** five car colours (white is free; 150, 300, 500, 1,000) and the five upgrades.

## How it is built

A small canvas game with no image files. Everything on screen is drawn in code.

- **One height function.** `H(x, y)` in `js/game.js` gives the ground height anywhere: a field of dunes from `dune()` (windward ramp, sharp crest, slip face), 560 px apart and up to 95 high, taller in some parts of the reserve than others; a set of small cross ripples; some noise; one big bump for Tal Moreeb; flat ground round each place; and a raised rim. The picture and the physics both read it, so what looks steep is steep.
- **Ground:** the sand is shaded from the slope of `H` into 256 px tiles, baked the first time they are needed and kept in a cache of 150. After that a frame copies about 15 images.
- **Driving:** the engine pushes along the car's heading, the slope pulls it downhill, the tyres only half hold sideways. When the ground falls away faster than gravity the car is in the air. Constants are at the top of the *state* section.
- **Sprites:** Abood, Baba, the car, animals and landmarks are drawn once with canvas paths into cached sprites.
- **Sound:** ZzFX effects built at load time, a Hijaz-scale tune with a maqsum beat, and an engine hum from one oscillator.
- **Touch:** steering reads touch events and answers each with `preventDefault`, so the browser's own gestures cannot take the finger away (this matters on iPad and iPhone, above all in the home-screen app); a mouse or pen comes through pointer events. The last line of *How to play* shows the version, where the game is running, and counts of what the screen has reported, for checking a device that misbehaves.
- **Phones:** lower render resolution to start with, dropped further if frames run slow; 60 fps cap in a run and 30 behind menus; HUD written only when a value changes; screen kept awake; pauses when the app is hidden.
- **Size:** about 120 KB of code and 430 KB in total, most of it the font. The share picture (90 KB) is only fetched by apps that show a link preview.

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

Every push to `main` runs `.github/workflows/pages.yml`, which stamps the commit id into `__BUILD__` (cache name and asset URLs) and publishes to the `gh-pages` branch. If the site does not appear after the first deploy, open **Settings → Pages** and set **Source** to **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**. The game is then at `https://mja-py.github.io/abood-liwa/`.

## Project layout

```
index.html              page, loading screen, menus
css/style.css           layout, RTL, phone breakpoints, self-hosted font faces
js/game.js              the game: terrain, driving, drawing, map, sound, menus, loader
js/i18n.js              Arabic and English text, language switch
js/vendor/zzfx.js       ZzFX sound synth (MIT)
assets/fonts/           Baloo Bhaijaan 2 (SIL OFL 1.1)
assets/icons/           app icons, generated from the game's own drawing of Abood
assets/og.jpg           the picture shown when the link is shared: a frame of the game at the camp
sw.js                   offline cache
manifest.webmanifest    install settings
.github/workflows/      GitHub Pages deploy
```

See [CREDITS.md](CREDITS.md) for third-party licences.
