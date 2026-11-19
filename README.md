# عبود في ليوا · Abood in Liwa

سفاري الكثبان في المتصفح: عبود بالكندورة والشماغ الأحمر يسوق سيارته بحرية في رمال ليوا. ما في طريق: المحمية دائرة مفتوحة من الرمل، تسوق وين ما تبا، تطلع التلال، تطير من فوق القمم، وتجمع التمر قبل لا يخلص البترول.

A free-roam dune safari for the browser, and a sister game to *Run, Abood!* and *Abood to the Moon*. Abood drives his dune car across a round, open reserve of Liwa sand. There is no track: drive anywhere, climb the dunes, fly off the crests, and collect dates before the fuel runs out. Arabic is the default language. The flag buttons switch to English.

## How to play

- **The first lesson:** a new player's first run is taught by Baba, one step at a time: drive, collect the six dates leading out of the camp, fly off the first ramp, drift, and pick up the red jerrycan. Each step ends when you have actually done it, and a ring and an arrow show where to go. The fuel does not run down meanwhile, Skip is always on the card, and finishing pays 30 dirhams. The run then carries on as normal. A lesson left unfinished is offered again on the next run; players who had already driven before it existed never see it. *How to play* has a button to take it again. Races never have it.
- **Touch:** put a finger anywhere and drag the way you want to go. Two rings appear under it: inside the first, the further you drag the faster you go; out past the second is *pressing hard*, which slides the car and does tricks in the air (see Stunts). There are no buttons to find. Drag backwards behind a car that is standing still, or held against something, and it reverses, swings its nose round to your finger and drives off.
- **Keyboard:** arrow keys or WASD. Up accelerates, down brakes and reverses, left and right steer. P or Esc pauses.
- **Dunes** are real ones in cross-section: a long gentle windward ramp that is still climbing at the crest, a sharp crest that catches the light, and a short dark slip face. They all face downwind. Build speed up the ramp and the car flies off the crest; coming the other way, the engine pulls 60% harder uphill and drops into low gear at a crawl, so the car charges the slip face, throws a tail of sand, and has speed left to hop the crest. The steepest faces on Tal Moreeb can still stop it; stall there and Baba says so.
- **Rolling:** driving across a steep slope, or landing sideways, rolls the car. It tumbles downhill, costs fuel, and Baba has something to say.
- **Never stuck:** under power the car pivots even at a standstill, so a nose against a tent or a palm can always turn away. If it still has not moved a car's length in two and a half seconds of throttle, Baba tows it to open sand close by.
- **Dates** turn into dirhams at the end of the run. A **red jerrycan** tops up the fuel.
- **The run ends** when the fuel runs out.

## The map

The reserve is a circle 13.6 km of pixels across, ringed by red flags: about 20 seconds from the camp to the rim at full speed, and 10 to 15 seconds from the camp to most places. The camp and the old well are in the middle; nine more places stand in a wide ring further out, and seven more beyond those, towards the rim. That makes 18. The first visit to a place gives its postcard and dirhams, more the further out it is.

There are two maps:

- **The round map** in the top corner during a run shows the sand around the car, north up, 2.6 km each way: the dunes, the car as a red arrow in the middle, jerrycans as red dots, golden dates as yellow dots, ramps as white arrows, and any place in range. The camp never leaves it: when it is out of range it sits on the edge, in its direction. So does the nearest jerrycan when none is in sight, and the next checkpoint in a race.
- **The big map** (tap the round one) shows the whole reserve, with the share uncovered and the places found written beside it.

### Discovery

Nothing but the camp is on the maps to begin with; the reserve has to be explored.

- **The haze:** the big map starts covered and clears for good wherever the car has been, about 450 pixels to each side. The regions' names show through it, and so do the jerrycans. Ramps and golden dates show only where it has cleared.
- **Places:** a place is on neither map until the car comes within 1.2 km of it. Then a note says something is out there and it appears on both maps as a question mark. Reaching it gives the postcard and its name.
- **Baba's hint:** a few seconds into every free run, while any place is still unfound, Baba says which way the nearest one lies.
- **Missions never name a place that has not been found.** Drive-to, against-the-clock, delivery and Tal Moreeb summit missions are only dealt for places already on the map.
- **Kept in the save:** the uncovered map is a 56 by 56 grid, half a kilobyte of text. A save from before this already knows the ground round each place it had found.

Someone who played on the smaller reserve keeps their postcards, medals, dirhams and levels. Best race times and ghosts start again, because every route is longer, and a note says so once.

### Regions

Round the home sands the reserve is cut into five regions, like slices of a pie. Each has its own dunes, sand colour and feel under the wheels, and its own share of what is scattered. The borders blend over a few hundred pixels and bend, a banner names a region as the car crosses into it, and the big map shows them by colour and name.

| Region | Where | The ground | What it is for |
|---|---|---|---|
| Home sands | Round the camp, out to about 2 km | The dunes as they have always been | A first run, and the first lesson |
| Salt plain | North | Pale and almost flat; the fastest ground, a little loose sideways | Top speed and long drifts |
| Moreeb dunes | East | Red sand; every dune tall, a third taller than anywhere else | Air time and stunt points |
| Empty Quarter | South | Gold sand; dunes riding on great ridges three dunes apart; soft sand that slows the car | Fuel planning: few jerrycans, and more golden dates than anywhere else |
| Gravel plain | South-west | Grey-brown, low and firm, with more grip | Animals, and fast level driving |
| Oasis belt | West | Greener sand, low dunes, palms standing alone to weave between | Dates: more than twice as many as anywhere else |

On the level the first car tops out near 430 pixels a second on the home sands, 530 on the salt, 480 on the gravel and 350 in the Empty Quarter. One function, `region()` in `js/game.js`, says how much of each region a point is; the terrain, the tile colours, the driving and the scatter all read it. Regions change how tall the dunes are, never their spacing or direction, so crest lines cross a border unbroken.

### Places

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
| Empty Quarter gate | The sign that marks the way into the Empty Quarter |
| Desert roses | Rosettes of sand crystal at the far end of the salt plain |
| The grandstand | A crowd under a striped awning at the foot of Tal Moreeb, and the start arch of the hill climb |
| The watchtower | A mud-brick tower on the eastern rim |
| The far camp | A second camp deep in the Empty Quarter, with fuel drums |
| Camel race track | An oval of raked sand between white rails, with racing camels |
| Date farm | A house, a watered field and nine palms in rows |
| The old village | Mud-brick houses, a wind tower and a well |

**Fuel stops:** the camp, the old well and the far camp each put 40% of a tank back, once a run, when the tank is under 60%. Fuel drums with a red jerrycan on top mark them, and on the maps a red dot on the place means it has not been used yet.

Camels and oryx wander near home and trot away from a fast car.

Between the places the sand is a playground:

- **Big dunes:** besides Tal Moreeb there are sixteen more big dunes without a name, four round the camp and twelve further out, 110 to 160 high.
- **Ramps:** 56 wooden kickers, each turned to face the longest drop near it, with a clear run-up and a clear landing. Drive up one the way its arrows point and it throws the car; the faster in, the higher out. The first is a short drive from the camp.
- **Hoops:** every second ramp has a red and white hoop to fly through, worth 120 stunt points once a run.
- **Boost strips:** about 40 strips of arrows on the sand give a shove the way they point. Some sit on the run-up to a ramp, so strip, ramp and hoop make one line.
- **Golden dates:** worth ten dates each. One sits on top of each big dune, and eight more move to new places every day.
- **Fuel:** there are only 10 jerrycans in the whole reserve, well apart, so fuel has to be looked for on the map, and three fuel stops (see the places above).
- **Today's sand:** the 180 lines of dates and 9 of the 10 jerrycans are placed from the date, so every day is a different map to learn, and everyone playing that day has the same one. The trail of six dates out of the camp, the first jerrycan, and every ramp, hoop and boost strip stay where they are. If the game is left open past midnight the new day is dealt between runs, never during one.

## Stunts

Every stunt scores points, shown above the car. Fifty points are worth one dirham at the end of the run, and there are missions for each kind.

- **Drift:** at speed, press hard (drag past the second ring) into a sharp turn; keyboard: hold Space while steering. Pressing hard straight ahead is just driving, and a sharp turn inside the first ring grips, so a slide is always a choice. The back steps out with a kick, the car holds an angle of about fifty degrees with the nose ahead of the way it is going, throws sand sideways, ploughs darker marks, and keeps about three quarters of its speed. It ends when the car points where your finger is, and a good one ends with a shove forward. A short hop over a crest does not break it. Points grow with speed and angle. A full circle is a donut.
- **Two wheels:** a fast turn, or driving across a slope, lifts one side of the car. Hold it there for points. On level sand the car cannot go over from turning alone; on a slope it can. A drift sheds the tipping force, so sliding is the safe way round a fast corner.
- **Spins and flips:** in the air, press hard backwards for a backflip, or hard across the jump for a 360 spin; pressing hard forwards does nothing, so holding the throttle open over a crest is safe (keyboard: Space with left or right, Space with down, F for a front flip). Each trick is one full turn, paced to finish before landing, and only starts when the jump is long enough. Land on the wheels to bank it.
- **Combo:** land a stunt within about three seconds of the last one and it scores double, then triple, up to five times. The clock waits while a stunt is under way, a ×2 badge under the car shows what the next stunt is worth and how long is left, and rolling the car sends it back to the start. Points already scored are never taken back.

## Missions, levels and races

What keeps a run worth starting once every postcard is found:

- **Missions:** dealt at random from 42 kinds, three at a time, a fourth from level 4 and a fifth from level 8. The first three are on the screen all through a run, each as a bar that fills. A finished one is ticked, then replaced a moment later in the same run by a new one that counts from that moment, and every third mission finished in one run pays a bonus. A replacement is never a kind you just had, and the set is spread over six categories: collecting (dates, dates in the first minute, jerrycans, dirhams earned, golden dates, dates in the oasis belt), driving (distance, distance without rolling, top speed, distance from the camp, boost strips, distance in the Empty Quarter), stunts (air time, one long jump, drift points, one big drift, donuts, two wheels in total and in one go, flips, spins, stunt points, combo, ramps, hoops, drift points on the salt plain, air time in the Moreeb dunes), exploring (places visited, drive to a named place, reach one against the clock, a delivery between two places, the Tal Moreeb summit, find the sand gazelles, regions driven in, a share of the map uncovered), races (finish one, win a medal) and five that add up over several runs.
- **Harder with level:** targets grow with your level up to a cap; each mission is one, two or three stars, and three-star missions go from about 1 in 12 at level 1 to nearly half from level 14 (an easy one is set as if two levels lower, a hard one four higher, and pays half as much again); and from level 5 some carry a twist: do it without rolling. A mission you do not fancy can be swapped in the Missions sheet for a few dirhams. The table of kinds is `MK` in `js/game.js`.
- **Levels:** missions, postcards, races and every run give experience; each level needs more than the last (125, 190, 265 … ). Each level pays dirhams, tops up the tank if it comes mid-run, and moves you up five ranks from Beginner to Desert falcon. Most levels open something: races at 2, 3, 4, 5, 7, 9, 11 and 12, the pickup at 3, a fourth mission at 4, the sand buggy at 6, a fifth mission at 8, the monster truck at 10. The results card and the Missions sheet always show the bar and the next thing it unlocks.
- **Races:** drive through places in order against the clock for bronze, silver and gold. Nine fixed races unlock by level: five from the start of the game's levels (1, 2, 4, 5, 7), the Tal Moreeb hill climb at 3, a sprint from the grandstand to the summit with medal times set by hand, and three through the outer places at levels 9, 11 and 12. A race of the day changes daily: a tour of four places near each other. Gold needs a clean drive: medal times come from a pace of 160, 220 and 285 pixels a second, adjusted for the ground the route crosses (faster over the salt, slower in the Empty Quarter), and a straight drive in the first car holds about 330 on the home sands. A place not yet found shows as ??? in a race's route, and driving the race finds it. Fuel does not run down in a race. An arrow and a light beacon point to the next checkpoint, the map shows the route, and the ghost of your best run races you.
- **Daily gift:** dirhams for the first visit each day, growing over seven days in a row. The same note tells a returning player that the sand has been dealt afresh.
- **Upgrades:** engine, tyres, balance, tank and date basket, five levels each (100, 250, 500, 900, 1,500).

## Animals

Drawn from the real animals of the Liwa sands: the dromedary with its rope halter, the Arabian oryx (white coat, brown legs, black face stripes, long ringed horns), the Arabian sand gazelle or reem, which bolts when the car comes near, and a hooded hunting falcon on its block.

## Economy

In-game dirhams only; there are no real payments. Progress is saved on the device.

- **End of run:** 10 dates = 1 dirham, plus 1 per 250 m driven, plus 1 per 50 stunt points.
- **Postcards:** 10 to 58 dirhams each, once, more for places far from the camp.
- **Garage:** four trucks, five colours (white is free; 150, 300, 500, 1,000) and the five upgrades. The trucks open by level and are then bought, and each drives differently: the dune car (free, balanced), the pickup (level 3, 400: steadier, bigger tank), the sand buggy (level 6, 900: quicker and flies further off a crest, but rolls more easily and carries less fuel) and the monster truck (level 10, 2,000: giant tyres, hardest to roll, strongest uphill). The numbers are `TRUCKS` in `js/game.js`.

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
