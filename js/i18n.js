const nf = n => Math.round(n).toLocaleString('en-US');
// Arabic is the default language; English is one tap away on the flag button.
const STR = {
  ar: {
    title: 'عبود في ليوا', abood: 'عبود',
    kicker: 'سفاري الكثبان!',
    story: 'عبود ركب سيارته وطلع رمال ليوا. سوق وين ما تبا: اطلع التلال، طير من فوقها، واجمع التمر قبل لا يخلص البترول.',
    start: 'يلا سفاري!', again: 'جولة ثانية', resume: 'كمّل', paused: 'استراحة', endRun: 'خلّص الجولة',
    m: 'م', dates: 'تمر', fuel: 'البترول', pause: 'إيقاف مؤقت', sound: 'الصوت والموسيقى', fullscreen: 'ملء الشاشة',
    b_cards: 'البطاقات', b_garage: 'الكراج', b_map: 'الخريطة', b_help: 'طريقة اللعب', b_close: 'إغلاق', b_menu: 'القائمة',
    pickTitle: 'اختر اللغة', pickHint: 'تقدر تغيّرها أي وقت من القائمة.',
    update: 'نسخة جديدة جاهزة', updateBtn: 'حدّث',
    loading: 'جاري التحميل…', ready: 'جاهز!',
    ios: 'على الآيفون والآيباد: مشاركة ← إضافة إلى الشاشة الرئيسية، عشان تلعب بملء الشاشة.',
    tips: ['خذ سرعة قبل التلة العالية، وانزل من الجهة الحادة.', 'لا تمشي بالعرض على المنحدر القوي، السيارة تنقلب!', 'الخريطة المدورة فوق: اضغطها تكبر.', 'جالون أحمر = بترول زيادة.', 'تل مرعب أعلى تلة في الخريطة. تقدر توصل القمة؟', 'حركة ورا حركة = كومبو، والنقاط تتضاعف!', 'اسحب إصبعك أبعد من الحلقة الثانية وأنت تلف = تفحيط!', 'أسهم السرعة ثم المنصة ثم الحلقة: أحلى قفزة!', 'التمر الذهبي فوق التلال العالية، والتمرة بعشر.', 'علّقت؟ اسحب إصبعك لورا والسيارة ترجع.'],
    best: n => `أحسن جولة ${nf(n)} م`,
    s_camp: 'المخيم', s_moreeb: 'تل مرعب', s_oasis: 'واحة ليوا', s_fort: 'حصن ليوا', s_camels: 'قافلة الجمال', s_oryx: 'المها العربي',
    s_falcon: 'وكر الصقر', s_well: 'البير القديم', s_sabkha: 'السبخة', s_festival: 'مهرجان الرطب', s_gate: 'بوابة الربع الخالي',
    gateSign: 'الربع الخالي', unknown: '؟؟؟',
    found: (name, n) => `بطاقة جديدة: ${name} · +${nf(n)} د.إ`,
    edge: 'هني آخر المحمية، ارجع!', fuelLow: 'البترول قرب يخلص! دوّر جالون أحمر', canPlus: '+ بترول',
    jump: s => `قفزة ${s} ث!`, bigJump: s => `طيران ${s} ث!!`, rolled: 'انقلبت السيارة!',
    baba: ['عبود! السيارة مب لعبة!', 'شوي شوي يا ولد!', 'قلبتها مرة ثانية؟!', 'امسك السكّان زين!', 'بابا: لا تمشي بالعرض على التلة!'],
    wow: ['يا سلام!', 'وااو!', 'طيران!', 'أحلى شي!'],
    overTitle: 'خلص البترول!', overTitleEnd: 'رجعنا المخيم', overQuote: ['بابا: يلا العشا جاهز!', 'بابا: باجر نكمل يا بطل', 'بابا: غسّل السيارة قبل لا تنام!'],
    overMsg: (m, d) => `سقت ${nf(m)} م في الرمل وجمعت ${nf(d)} تمرة.`, newBest: 'رقم جديد!',
    sMetres: 'متر', sAir: 'ثواني طيران', sBest: 'أحسن جولة',
    o_swap: 'نبدّل التمر بدراهم', partS: (d, c) => `${nf(d)} تمرة = ${nf(c)}`, partD: (m, c) => `${nf(m)} م = ${nf(c)}`, partA: (p, c) => `حركات ${nf(p)} = ${nf(c)}`,
    overCards: n => `بطاقات جديدة هالجولة: ${n}`,
    cardsTitle: 'بطاقات ليوا', cardsNote: (n, t) => `لقيت ${n} من ${t}. سوق لين المكان عشان تاخذ بطاقته.`,
    garageTitle: 'الكراج', garageNote: 'دراهم داخل اللعبة فقط. ما في دفع حقيقي.',
    c_red: 'أحمر الشماغ', c_teal: 'فيروزي', c_yellow: 'أصفر', c_white: 'أبيض الصحرا', c_black: 'أسود وذهبي',
    free: 'مجاني', buy: n => `اشتر · ${nf(n)} د.إ`, use: 'اختر', using: 'هذي سيارتك', notEnough: 'ما عندك دراهم كفاية', bought: 'تم الشراء!',
    tank: 'خزان أكبر', tankD: n => `بترول زيادة في كل جولة · مستوى ${n} من 3`, tankMax: 'أعلى مستوى',
    mapTitle: 'خريطة ليوا', mapNote: 'السهم الأحمر مكانك. النقط الحمرا جوالين بترول، والصفرا تمر ذهبي يتغير مكانه كل يوم. الأسهم البيضا منصات قفز.',
    b_missions: 'المهمات', b_races: 'السباقات', lv: n => `مستوى ${n}`, cp: 'نقطة', go: 'يلا!',
    rank: ['مبتدئ', 'سوّاق رمل', 'خبير تلال', 'بطل ليوا', 'صقر الصحرا'],
    lvlUp: (n, c) => `مستوى ${n}! · +${nf(c)} د.إ`, daily: (n, c) => `هدية اليوم ${n} على التوالي · +${nf(c)} د.إ`,
    misTitle: 'المهمات', misNote: n => `أول ثلاث مهمات تشوفها على الشاشة وأنت تسوق. إذا خلصت وحدة تجيك غيرها في نفس الجولة، وكل ثلاث مهمات في جولة وحدة لها جايزة زيادة. كل ما ارتفع مستواك صارت أصعب وجايزتها أكبر، والنجوم تبيّن الصعوبة. مستوى 4 يفتح مهمة رابعة، ومستوى 8 الخامسة. أيام اللعب على التوالي: ${n}.`,
    mDone: (m, c) => `خلصت المهمة: ${m} · +${nf(c)} د.إ`, mDoneShort: 'تمت!', mTriple: (n, c) => `${n} مهمات في جولة! +${nf(c)}`,
    m_gold: n => n > 1 ? `اجمع ${n} تمرات ذهبية في جولة وحدة` : 'لقّط تمرة ذهبية', m_ramp: n => `اقفز من ${n} منصات في جولة وحدة`, m_hoop: n => n > 1 ? `طير من وسط ${n} حلقات في جولة وحدة` : 'طير من وسط حلقة', m_boost: n => `مرّ على ${n} أسهم السرعة في جولة وحدة`,
    m_dates: n => `اجمع ${n} تمرة في جولة وحدة`, m_dist: n => `سوق ${nf(n)} م في جولة وحدة`, m_air: n => `طير ${n} ثانية في جولة وحدة`, m_jump: n => `سوّ قفزة ${n} ثانية`,
    m_visit: n => `زور ${n} أماكن في جولة وحدة`, m_noroll: n => `سوق ${nf(n)} م بدون ما تنقلب`, m_cans: n => `اجمع ${n} جالون بترول في جولة وحدة`,
    m_deliver: (a, b) => `وصّل من ${a} لين ${b}`, m_summit: () => 'اطلع قمة تل مرعب', m_tdates: n => `اجمع ${nf(n)} تمرة على كم جولة`, m_tdist: n => `سوق ${nf(n)} م على كم جولة`,
    raceTitle: 'السباقات', raceNote: 'مرّ على الأماكن بالترتيب بأسرع وقت. البترول ما يخلص في السباق، وشبح أحسن جولة لك يسابقك.',
    r_daily: 'سباق اليوم', r_camp: 'لفة المخيم', r_oasis: 'طريق الواحة', r_moreeb: 'تحدي تل مرعب', r_south: 'درب الجنوب', r_grand: 'جولة ليوا الكبرى',
    raceGo: 'ابدأ', locked: n => `مستوى ${n}`, bestTime: s => `أحسن وقت ${s}`, raceHud: (n, s) => `${n} · الذهب ${s}`,
    medal0: 'وصلت!', medal1: 'برونزية!', medal2: 'فضية!', medal3: 'ذهبية!', raceQuit: 'ما كملت السباق', raceQuitMsg: 'جرّب مرة ثانية، الطريق صار معروف.',
    raceMsg: (t, b) => `وقتك ${t} · أحسن وقت ${b}`, overMedal: c => `جايزة السباق +${nf(c)}`, overBestTime: 'وقت قياسي جديد', overMis: (n, c) => `مهمات خلصت: ${n} (+${nf(c)})`, overLvl: n => `وصلت مستوى ${n}`,
    upTitle: 'تطويرات السيارة', upMax: 'أعلى مستوى', trTitle: 'السيارات', colTitle: 'الألوان',
    t_classic: 'سيارة التلال', td_classic: 'متوازنة في كل شي', t_pickup: 'الوانيت', td_pickup: 'ثابتة وخزانها أكبر', t_buggy: 'البقي', td_buggy: 'سريعة وتطير عالي، بس تنقلب بسهولة', t_monster: 'الوحش', td_monster: 'تواير عملاقة تطلع أي تلة',
    un_race: 'سباق جديد', un_slot: 'مهمة زيادة', un_grand: 'جولة ليوا الكبرى', unNext: (n, w) => `مستوى ${n} يفتح: ${w}`, unNow: w => `انفتح: ${w}`,
    u_engine: 'المحرك', ud_engine: 'سرعة وقوة أكثر على التلال', u_tyres: 'التواير', ud_tyres: 'تمسك الرمل وما تغوص', u_balance: 'التوازن', ud_balance: 'صعب تنقلب على المنحدر',
    u_tank: 'الخزان', ud_tank: 'بترول أكثر في كل جولة', u_magnet: 'سلة التمر', ud_magnet: 'تلقط التمر من مسافة أبعد',
    st_boost: 'دفعة سرعة!', st_hoop: 'من وسط الحلقة!', goldPlus: 'تمرة ذهبية! +10', stall: 'بابا: التلة حادة! ارجع وخذ سرعة، أو اطلعها بالورب.', towed: 'بابا: علّقت؟ سحبتك، يلا كمّل!',
    st_drift: 'تفحيط', st_two: s => `على تايرين ${s} ث`, st_donut: 'دونات! +120', st_back: n => n > 1 ? `شقلبة ورا ×${n}` : 'شقلبة ورا!', st_front: n => n > 1 ? `شقلبة قدام ×${n}` : 'شقلبة قدام!',
    m_drift: n => `اجمع ${nf(n)} نقطة تفحيط في جولة وحدة`, m_two: n => `امش على تايرين ${n} ثانية في جولة وحدة`, m_flip: n => n > 1 ? `سوّ ${n} شقلبات في جولة وحدة` : 'سوّ شقلبة في الهوا وانزل على التواير',
    m_spin: n => n > 1 ? `سوّ ${n} لفات 360 في الهوا` : 'سوّ لفة 360 في الهوا', m_stunt: n => `اجمع ${nf(n)} نقطة حركات في جولة وحدة`,
    m_rush: n => `اجمع ${n} تمرة في أول دقيقة`, m_earn: n => `اكسب ${nf(n)} درهم في جولة وحدة`, m_speed: n => `وصّل السرعة ${n} كم/س`, m_far: n => `ابعد ${nf(n)} م عن المخيم`,
    m_bigdrift: n => `سوّ تفحيطة وحدة بـ ${nf(n)} نقطة`, m_donut: n => n > 1 ? `سوّ ${n} دونات في جولة وحدة` : 'سوّ دونات كاملة', m_twohold: n => `امش على تايرين ${n} ثانية ورا بعض`,
    m_goto: a => `روح ${a}`, m_dash: (a, s) => `وصّل ${a} في ${s} ثانية من بداية الجولة`, m_reem: n => `شوف ${n} من غزلان الريم`,
    m_race: () => 'كمّل أي سباق', m_medal: n => ['خذ ميدالية في أي سباق', 'خذ فضية أو ذهبية في أي سباق', 'خذ ذهبية في أي سباق'][n - 1],
    m_tstunt: n => `اجمع ${nf(n)} نقطة حركات على كم جولة`, m_tair: n => `طير ${nf(n)} ثانية على كم جولة`, m_tvisit: n => `زور ${n} مكان على كم جولة`,
    m_nr: ' · بدون انقلاب', swap: n => `غيّر · ${nf(n)}`,
    comboLost: 'راح الكومبو!', m_combo: n => `وصّل الكومبو ×${n}`, overCombo: n => `أحسن كومبو ×${n}`,
    helpTitle: 'طريقة اللعب',
    help: ['اللمس: حط إصبعك في أي مكان واسحب للجهة اللي تبا تروحها. كل ما سحبت أكثر زادت السرعة.', 'إذا وقفت السيارة قدام شي، اسحب إصبعك لورا: ترجع وتلف. وإذا علّقت بابا يسحبك.', 'الكيبورد: الأسهم أو WASD. فوق بنزين، تحت بريك ورجوع، يمين ويسار للفّة.',
      'كل تلة لها جهة سهلة طويلة وجهة حادة قصيرة، والريح تمشي من السهلة للحادة. خذ سرعة واطلع من السهلة وتطير من فوق القمة. الجهة الحادة بدون سرعة تطلعها شوي شوي.', 'لا تمشي بالعرض على منحدر حاد ولا تنزل على جنب، السيارة تنقلب ويضيع منك بترول.',
      'تفحيط: وأنت مسرع ادعس بقوة، يعني اسحب إصبعك لين برّا الحلقة الثانية، وأنت تلف لفة قوية. السيارة تنزلق بالعرض وتجمع نقاط، والتفحيطة الزينة تعطيك دفعة سرعة. لفة كاملة = دونات. (كيبورد: مسطرة مع اللفّة)', 'على تايرين: لفّ بسرعة أو امش بالعرض على منحدر لين يرتفع جنب السيارة. على الأرض المستوية ما تنقلب، بس على المنحدر وازنها.', 'في الهوا: اسحب بقوة لورا عشان تتشقلب، أو بقوة لجنب القفزة عشان تلف 360. (كيبورد: مسطرة مع الأسهم)', 'كومبو: سوّ حركة ورا حركة بسرعة، والنقاط تتضاعف من ×2 لين ×5. إذا انقلبت السيارة يرجع من أول.', 'منصات الخشب تطيّرك: ادخلها مع اتجاه الأسهم، وكل ما كنت أسرع طرت أعلى. طير من وسط الحلقة الحمرا وخذ نقاط. أسهم السرعة على الرمل تعطيك دفعة.', 'اجمع التمر: كل 10 تمرات بدرهم. التمرة الذهبية بعشر تمرات، وتلقاها فوق التلال العالية وفي أماكن تتغير كل يوم. الجالون الأحمر يعبّي البترول. كل 50 نقطة حركات بدرهم.', 'في الخريطة 11 مكان. أول مرة توصل مكان تاخذ بطاقته ودراهم.', 'المهمات: ثلاث أهداف على الشاشة وأنت تسوق. خلّص وحدة وتجيك غيرها على طول، وكل ثلاث في جولة وحدة لها جايزة. المهمات ترفع مستواك، وكل مستوى يفتح شي: سباق، مهمة زيادة أو سيارة جديدة.', 'السباقات: مرّ على الأماكن بالترتيب وخذ برونزية أو فضية أو ذهبية. كل يوم سباق جديد.', 'الكراج: أربع سيارات، كل وحدة لها سواقة غير: سيارة التلال، الوانيت، البقي والوحش. وطوّر المحرك والتواير والتوازن والخزان وسلة التمر.', 'الجولة تخلص لما يخلص البترول.'],
  },
  en: {
    title: 'Abood in Liwa', abood: 'Abood',
    kicker: 'Dune safari!',
    story: 'Abood has taken his car out on the Liwa sands. Drive wherever you like: climb the dunes, fly off the crests, and collect dates before the fuel runs out.',
    start: 'Start the safari!', again: 'Go again', resume: 'Carry on', paused: 'Paused', endRun: 'End the run',
    m: 'm', dates: 'dates', fuel: 'Fuel', pause: 'Pause', sound: 'Sound and music', fullscreen: 'Full screen',
    b_cards: 'Postcards', b_garage: 'Garage', b_map: 'Map', b_help: 'How to play', b_close: 'Close', b_menu: 'Menu',
    pickTitle: 'Choose a language', pickHint: 'You can change it any time from the menu.',
    update: 'A new version is ready', updateBtn: 'Update',
    loading: 'Loading…', ready: 'Ready!',
    ios: 'On iPhone and iPad: Share → Add to Home Screen to play full screen.',
    tips: ['Build up speed before a tall dune, and come down the steep side.', 'Don\'t drive across a steep slope. The car will roll!', 'Tap the round map at the top to make it bigger.', 'A red jerrycan means more fuel.', 'Tal Moreeb is the tallest dune on the map. Can you reach the top?', 'Chain your stunts for a combo: the points multiply!', 'Drag past the second ring while you turn to drift!', 'Boost strip, then ramp, then hoop: the best jump there is!', 'Golden dates sit on top of the big dunes. Each one counts as ten.', 'Stuck? Pull the pad back and the car reverses.'],
    best: n => `Best run ${nf(n)} m`,
    s_camp: 'The camp', s_moreeb: 'Tal Moreeb', s_oasis: 'Liwa Oasis', s_fort: 'Liwa Fort', s_camels: 'Camel caravan', s_oryx: 'Arabian oryx',
    s_falcon: 'Falcon perch', s_well: 'The old well', s_sabkha: 'The salt flat', s_festival: 'Date festival', s_gate: 'Empty Quarter gate',
    gateSign: 'EMPTY QUARTER', unknown: '???',
    found: (name, n) => `New postcard: ${name} · +${nf(n)} AED`,
    edge: 'This is the edge of the reserve. Turn back!', fuelLow: 'Fuel is low! Look for a red jerrycan', canPlus: '+ fuel',
    jump: s => `${s} s jump!`, bigJump: s => `${s} s of flying!!`, rolled: 'The car rolled!',
    baba: ['Abood! The car is not a toy!', 'Slow down, boy!', 'You rolled it again?!', 'Hold the wheel properly!', 'Baba: don\'t drive across the dune!'],
    wow: ['Yalla!', 'Wow!', 'Flying!', 'Best thing ever!'],
    overTitle: 'Out of fuel!', overTitleEnd: 'Back at camp', overQuote: ['Baba: dinner is ready!', 'Baba: more tomorrow, champ', 'Baba: wash the car before bed!'],
    overMsg: (m, d) => `You drove ${nf(m)} m of sand and collected ${nf(d)} dates.`, newBest: 'New best!',
    sMetres: 'metres', sAir: 'seconds in the air', sBest: 'best run',
    o_swap: 'Dates turn into dirhams', partS: (d, c) => `${nf(d)} dates = ${nf(c)}`, partD: (m, c) => `${nf(m)} m = ${nf(c)}`, partA: (p, c) => `stunts ${nf(p)} = ${nf(c)}`,
    overCards: n => `New postcards this run: ${n}`,
    cardsTitle: 'Liwa postcards', cardsNote: (n, t) => `You have found ${n} of ${t}. Drive to a place to collect its postcard.`,
    garageTitle: 'Garage', garageNote: 'In-game dirhams only. There are no real payments.',
    c_red: 'Shemagh red', c_teal: 'Teal', c_yellow: 'Yellow', c_white: 'Desert white', c_black: 'Black and gold',
    free: 'Free', buy: n => `Buy · ${nf(n)} AED`, use: 'Choose', using: 'Your car', notEnough: 'Not enough dirhams', bought: 'Bought!',
    tank: 'Bigger tank', tankD: n => `Extra fuel on every run · level ${n} of 3`, tankMax: 'Top level',
    mapTitle: 'Map of Liwa', mapNote: 'The red arrow is you. Red dots are jerrycans, and yellow dots are golden dates, which move every day. The white arrows are ramps.',
    b_missions: 'Missions', b_races: 'Races', lv: n => `Level ${n}`, cp: 'checkpoint', go: 'Go!',
    rank: ['Beginner', 'Sand driver', 'Dune expert', 'Liwa champion', 'Desert falcon'],
    lvlUp: (n, c) => `Level ${n}! · +${nf(c)} AED`, daily: (n, c) => `Daily gift, day ${n} in a row · +${nf(c)} AED`,
    misTitle: 'Missions', misNote: n => `The first three missions are on the screen while you drive. Finish one and a new one takes its place in the same run, and every third mission in one run pays a bonus. They get harder and pay more as your level rises, and stars show how hard one is. Level 4 opens a fourth mission and level 8 a fifth. Days played in a row: ${n}.`,
    mDone: (m, c) => `Mission done: ${m} · +${nf(c)} AED`, mDoneShort: 'Done!', mTriple: (n, c) => `${n} missions in one run! +${nf(c)}`,
    m_gold: n => n > 1 ? `Collect ${n} golden dates in one run` : 'Collect a golden date', m_ramp: n => `Jump off ${n} ramps in one run`, m_hoop: n => n > 1 ? `Fly through ${n} hoops in one run` : 'Fly through a hoop', m_boost: n => `Hit ${n} boost strips in one run`,
    m_dates: n => `Collect ${n} dates in one run`, m_dist: n => `Drive ${nf(n)} m in one run`, m_air: n => `Spend ${n} s in the air in one run`, m_jump: n => `Make a ${n} s jump`,
    m_visit: n => `Visit ${n} places in one run`, m_noroll: n => `Drive ${nf(n)} m without rolling`, m_cans: n => `Collect ${n} jerrycans in one run`,
    m_deliver: (a, b) => `Deliver from ${a} to ${b}`, m_summit: () => 'Reach the top of Tal Moreeb', m_tdates: n => `Collect ${nf(n)} dates over several runs`, m_tdist: n => `Drive ${nf(n)} m over several runs`,
    raceTitle: 'Races', raceNote: 'Pass the places in order as fast as you can. Fuel does not run out in a race, and the ghost of your best run races you.',
    r_daily: 'Race of the day', r_camp: 'Camp loop', r_oasis: 'Oasis road', r_moreeb: 'Tal Moreeb challenge', r_south: 'Southern trail', r_grand: 'Liwa grand tour',
    raceGo: 'Start', locked: n => `Level ${n}`, bestTime: s => `Best ${s}`, raceHud: (n, s) => `${n} · gold ${s}`,
    medal0: 'Finished!', medal1: 'Bronze!', medal2: 'Silver!', medal3: 'Gold!', raceQuit: 'Race not finished', raceQuitMsg: 'Try again. You know the way now.',
    raceMsg: (t, b) => `Your time ${t} · best ${b}`, overMedal: c => `Race prize +${nf(c)}`, overBestTime: 'New best time', overMis: (n, c) => `Missions done: ${n} (+${nf(c)})`, overLvl: n => `Reached level ${n}`,
    upTitle: 'Car upgrades', upMax: 'Top level', trTitle: 'Trucks', colTitle: 'Colours',
    t_classic: 'Dune car', td_classic: 'Good at everything', t_pickup: 'Pickup', td_pickup: 'Steady, with a bigger tank', t_buggy: 'Sand buggy', td_buggy: 'Fast and flies high, but rolls easily', t_monster: 'Monster truck', td_monster: 'Giant tyres that climb anything',
    un_race: 'a new race', un_slot: 'an extra mission', un_grand: 'the Liwa grand tour', unNext: (n, w) => `Level ${n} unlocks: ${w}`, unNow: w => `Unlocked: ${w}`,
    u_engine: 'Engine', ud_engine: 'More speed and pull on the dunes', u_tyres: 'Tyres', ud_tyres: 'Grip the sand and sink less', u_balance: 'Balance', ud_balance: 'Harder to roll on a slope',
    u_tank: 'Tank', ud_tank: 'More fuel on every run', u_magnet: 'Date basket', ud_magnet: 'Picks up dates from further away',
    st_boost: 'Boost!', st_hoop: 'Through the hoop!', goldPlus: 'Golden date! +10', stall: 'Baba: too steep! Back up for a run at it, or climb it at an angle.', towed: 'Baba: stuck? I pulled you out. Off you go!',
    st_drift: 'Drift', st_two: s => `Two wheels ${s} s`, st_donut: 'Donut! +120', st_back: n => n > 1 ? `Backflip x${n}` : 'Backflip!', st_front: n => n > 1 ? `Front flip x${n}` : 'Front flip!',
    m_drift: n => `Score ${nf(n)} drift points in one run`, m_two: n => `Drive ${n} s on two wheels in one run`, m_flip: n => n > 1 ? `Land ${n} flips in one run` : 'Land a flip on your wheels',
    m_spin: n => n > 1 ? `Land ${n} 360 spins` : 'Land a 360 spin', m_stunt: n => `Score ${nf(n)} stunt points in one run`,
    m_rush: n => `Collect ${n} dates in the first minute`, m_earn: n => `Earn ${nf(n)} dirhams in one run`, m_speed: n => `Reach ${n} km/h`, m_far: n => `Get ${nf(n)} m away from the camp`,
    m_bigdrift: n => `Score ${nf(n)} points in a single drift`, m_donut: n => n > 1 ? `Do ${n} donuts in one run` : 'Do a full donut', m_twohold: n => `Hold two wheels for ${n} s in one go`,
    m_goto: a => `Drive to: ${a}`, m_dash: (a, s) => `Reach ${a} within ${s} s of setting off`, m_reem: n => `Find ${n} sand gazelles`,
    m_race: () => 'Finish any race', m_medal: n => ['Win a medal in any race', 'Win silver or gold in any race', 'Win gold in any race'][n - 1],
    m_tstunt: n => `Score ${nf(n)} stunt points over several runs`, m_tair: n => `Spend ${nf(n)} s in the air over several runs`, m_tvisit: n => `Visit ${n} places over several runs`,
    m_nr: ' · without rolling', swap: n => `Swap · ${nf(n)}`,
    comboLost: 'Combo lost!', m_combo: n => `Reach a ×${n} combo`, overCombo: n => `Best combo ×${n}`,
    helpTitle: 'How to play',
    help: ['Touch: put a finger anywhere and drag the way you want to go. Drag further to go faster.', 'If the car is stopped against something, drag backwards: it reverses and swings round. If it is truly stuck, Baba tows it out.', 'Keyboard: arrow keys or WASD. Up is the accelerator, down brakes and reverses, left and right steer.',
      'Every dune has a long gentle side and a short steep side, and they all face the same way. Build speed up the gentle side and you fly off the crest. Without a run-up, the steep side is a slow crawl.', 'Don\'t drive across a steep slope or land sideways. The car rolls and you lose fuel.',
      'Drift: at speed, press hard, which means dragging your finger out past the second ring, while you turn sharply. The car slides sideways and scores points, and a good drift ends with a burst of speed. A full circle is a donut. (Keyboard: Space while steering.)', 'Two wheels: turn fast, or drive across a slope, until one side lifts. On level sand the car will not go over; on a slope you have to balance it.', 'In the air: drag hard backwards for a backflip, or hard across the jump for a 360 spin. (Keyboard: Space with the arrows.)', 'Combo: land one stunt soon after another and the points multiply, from ×2 up to ×5. Rolling the car resets it.', 'Wooden ramps throw you into the air: drive up them the way the arrows point, and the faster you go in the higher you fly. Fly through a red hoop for points. Boost strips on the sand give you a shove.', 'Collect dates: every 10 dates is 1 dirham. A golden date counts as ten; they sit on top of the big dunes and in places that change every day. A red jerrycan tops up the fuel. Every 50 stunt points is 1 dirham.', 'There are 11 places on the map. The first time you reach one you get its postcard and dirhams.', 'Missions: three targets are on the screen while you drive. Finish one and another takes its place straight away, and every third in one run pays a bonus. They raise your level, and each level unlocks something: a race, an extra mission or a new truck.', 'Races: pass the places in order for bronze, silver or gold. There is a new race every day.', 'The garage has four trucks, and each drives differently: the dune car, the pickup, the sand buggy and the monster truck. You can also upgrade the engine, tyres, balance, tank and date basket.', 'The run ends when the fuel runs out.'],
  },
};

// Flags shown on the switch: the flag of the language you would switch TO.
export const FLAG = {
  en: '<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="ukS"><path d="M0,0v30h60V0z"/></clipPath><clipPath id="ukT"><path d="M30,15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#ukS)"><path d="M0,0v30h60V0z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#ukT)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  ar: '<svg viewBox="0 0 12 6" aria-hidden="true"><rect width="12" height="2" fill="#00732f"/><rect y="2" width="12" height="2" fill="#fff"/><rect y="4" width="12" height="2" fill="#000"/><rect width="3" height="6" fill="#ff0000"/></svg>',
};

// The language choice is shared with the other Abood games on the same site.
let lang = 'ar';
try { const s = localStorage.getItem('abood-lang'); if (s === 'en' || s === 'ar') lang = s; } catch (e) {}
const listeners = [];

export const getLang = () => lang;
export function T(key, ...args) {
  const v = STR[lang][key] ?? STR.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
export function onLang(fn) { listeners.push(fn); }
export const hasStoredLang = () => { try { const v = localStorage.getItem('abood-lang'); return v === 'ar' || v === 'en'; } catch (e) { return false; } };
export function applyLang() {
  const root = document.documentElement;
  root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = T('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', T(el.dataset.i18nAria)); });
  document.querySelectorAll('.lang').forEach(g => {
    g.innerHTML = ['ar', 'en'].map(l => `<button type="button" data-lang="${l}" class="${l === lang ? 'on' : ''}" aria-pressed="${l === lang}" aria-label="${l === 'ar' ? 'العربية' : 'English'}">${FLAG[l]}</button>`).join('');
  });
  listeners.forEach(fn => fn(lang));
}
export function setLang(l) {
  lang = l; try { localStorage.setItem('abood-lang', l); } catch (e) {}
  applyLang();
}
