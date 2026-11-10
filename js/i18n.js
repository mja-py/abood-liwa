const nf = n => Math.round(n).toLocaleString('en-US');
// Arabic is the default language; English is one tap away on the flag button.
const STR = {
  ar: {
    title: 'عبود في ليوا', abood: 'عبود',
    kicker: 'سفاري الكثبان!',
    story: 'عبود ركب البقي وطلع رمال ليوا. سوق وين ما تبا: اطلع التلال، طير من فوقها، واجمع التمر قبل لا يخلص البترول.',
    start: 'يلا سفاري!', again: 'جولة ثانية', resume: 'كمّل', paused: 'استراحة', endRun: 'خلّص الجولة',
    m: 'م', dates: 'تمر', fuel: 'البترول', pause: 'إيقاف مؤقت', sound: 'الصوت والموسيقى', fullscreen: 'ملء الشاشة',
    b_cards: 'البطاقات', b_garage: 'الكراج', b_map: 'الخريطة', b_help: 'طريقة اللعب', b_close: 'إغلاق', b_menu: 'القائمة',
    pickTitle: 'اختر اللغة', pickHint: 'تقدر تغيّرها أي وقت من القائمة.',
    update: 'نسخة جديدة جاهزة', updateBtn: 'حدّث',
    loading: 'جاري التحميل…', ready: 'جاهز!',
    ios: 'على الآيفون: مشاركة ← إضافة إلى الشاشة الرئيسية، عشان تلعب بملء الشاشة.',
    tips: ['خذ سرعة قبل التلة العالية، وانزل من الجهة الحادة.', 'لا تمشي بالعرض على المنحدر القوي، البقي ينقلب!', 'الخريطة المدورة فوق: اضغطها تكبر.', 'جالون أحمر = بترول زيادة.', 'تل مرعب أعلى تلة في الخريطة. تقدر توصل القمة؟'],
    best: n => `أحسن جولة ${nf(n)} م`,
    s_camp: 'المخيم', s_moreeb: 'تل مرعب', s_oasis: 'واحة ليوا', s_fort: 'حصن ليوا', s_camels: 'قافلة الجمال', s_oryx: 'المها العربي',
    s_falcon: 'وكر الصقر', s_well: 'البير القديم', s_sabkha: 'السبخة', s_festival: 'مهرجان الرطب', s_gate: 'بوابة الربع الخالي',
    gateSign: 'الربع الخالي', unknown: '؟؟؟',
    found: (name, n) => `بطاقة جديدة: ${name} · +${nf(n)} د.إ`,
    edge: 'هني آخر المحمية، ارجع!', fuelLow: 'البترول قرب يخلص! دوّر جالون أحمر', canPlus: '+ بترول',
    jump: s => `قفزة ${s} ث!`, bigJump: s => `طيران ${s} ث!!`, rolled: 'انقلب البقي!',
    baba: ['عبود! البقي مب لعبة!', 'شوي شوي يا ولد!', 'قلبتها مرة ثانية؟!', 'امسك السكّان زين!', 'بابا: لا تمشي بالعرض على التلة!'],
    wow: ['يا سلام!', 'وااو!', 'طيران!', 'أحلى شي!'],
    overTitle: 'خلص البترول!', overTitleEnd: 'رجعنا المخيم', overQuote: ['بابا: يلا العشا جاهز!', 'بابا: باجر نكمل يا بطل', 'بابا: غسّل البقي قبل لا تنام!'],
    overMsg: (m, d) => `سقت ${nf(m)} م في الرمل وجمعت ${nf(d)} تمرة.`, newBest: 'رقم جديد!',
    sMetres: 'متر', sAir: 'ثواني طيران', sBest: 'أحسن جولة',
    o_swap: 'نبدّل التمر بدراهم', partS: (d, c) => `${nf(d)} تمرة = ${nf(c)}`, partD: (m, c) => `${nf(m)} م = ${nf(c)}`, partA: (s, c) => `طيران ${s} ث = ${nf(c)}`,
    overCards: n => `بطاقات جديدة هالجولة: ${n}`,
    cardsTitle: 'بطاقات ليوا', cardsNote: (n, t) => `لقيت ${n} من ${t}. سوق لين المكان عشان تاخذ بطاقته.`,
    garageTitle: 'الكراج', garageNote: 'دراهم داخل اللعبة فقط. ما في دفع حقيقي.',
    c_red: 'أحمر الشماغ', c_teal: 'فيروزي', c_yellow: 'أصفر', c_white: 'أبيض', c_black: 'أسود وذهبي',
    free: 'مجاني', buy: n => `اشتر · ${nf(n)} د.إ`, use: 'اختر', using: 'هذا بقّيك', notEnough: 'ما عندك دراهم كفاية', bought: 'تم الشراء!',
    tank: 'خزان أكبر', tankD: n => `بترول زيادة في كل جولة · مستوى ${n} من 3`, tankMax: 'أعلى مستوى',
    mapTitle: 'خريطة ليوا', mapNote: 'السهم الأحمر مكانك. النقط الحمرا الصغيرة جوالين بترول.',
    helpTitle: 'طريقة اللعب',
    help: ['اللمس: حط إصبعك في أي مكان واسحب للجهة اللي تبا تروحها. كل ما سحبت أكثر زادت السرعة.', 'الكيبورد: الأسهم أو WASD. فوق بنزين، تحت بريك ورجوع، يمين ويسار للفّة.',
      'التلال لها جهة سهلة وجهة حادة. خذ سرعة واطلع من السهلة، وتطير من فوق القمة.', 'لا تمشي بالعرض على منحدر حاد ولا تنزل على جنب، البقي ينقلب ويضيع منك بترول.',
      'اجمع التمر: كل 10 تمرات بدرهم. الجالون الأحمر يعبّي البترول.', 'في الخريطة 11 مكان. أول مرة توصل مكان تاخذ بطاقته ودراهم.', 'الجولة تخلص لما يخلص البترول.'],
  },
  en: {
    title: 'Abood in Liwa', abood: 'Abood',
    kicker: 'Dune safari!',
    story: 'Abood has taken the buggy out on the Liwa sands. Drive wherever you like: climb the dunes, fly off the crests, and collect dates before the fuel runs out.',
    start: 'Start the safari!', again: 'Go again', resume: 'Carry on', paused: 'Paused', endRun: 'End the run',
    m: 'm', dates: 'dates', fuel: 'Fuel', pause: 'Pause', sound: 'Sound and music', fullscreen: 'Full screen',
    b_cards: 'Postcards', b_garage: 'Garage', b_map: 'Map', b_help: 'How to play', b_close: 'Close', b_menu: 'Menu',
    pickTitle: 'Choose a language', pickHint: 'You can change it any time from the menu.',
    update: 'A new version is ready', updateBtn: 'Update',
    loading: 'Loading…', ready: 'Ready!',
    ios: 'On iPhone: Share → Add to Home Screen to play full screen.',
    tips: ['Build up speed before a tall dune, and come down the steep side.', 'Don\'t drive across a steep slope. The buggy will roll!', 'Tap the round map at the top to make it bigger.', 'A red jerrycan means more fuel.', 'Tal Moreeb is the tallest dune on the map. Can you reach the top?'],
    best: n => `Best run ${nf(n)} m`,
    s_camp: 'The camp', s_moreeb: 'Tal Moreeb', s_oasis: 'Liwa Oasis', s_fort: 'Liwa Fort', s_camels: 'Camel caravan', s_oryx: 'Arabian oryx',
    s_falcon: 'Falcon perch', s_well: 'The old well', s_sabkha: 'The salt flat', s_festival: 'Date festival', s_gate: 'Empty Quarter gate',
    gateSign: 'EMPTY QUARTER', unknown: '???',
    found: (name, n) => `New postcard: ${name} · +${nf(n)} AED`,
    edge: 'This is the edge of the reserve. Turn back!', fuelLow: 'Fuel is low! Look for a red jerrycan', canPlus: '+ fuel',
    jump: s => `${s} s jump!`, bigJump: s => `${s} s of flying!!`, rolled: 'The buggy rolled!',
    baba: ['Abood! The buggy is not a toy!', 'Slow down, boy!', 'You rolled it again?!', 'Hold the wheel properly!', 'Baba: don\'t drive across the dune!'],
    wow: ['Yalla!', 'Wow!', 'Flying!', 'Best thing ever!'],
    overTitle: 'Out of fuel!', overTitleEnd: 'Back at camp', overQuote: ['Baba: dinner is ready!', 'Baba: more tomorrow, champ', 'Baba: wash the buggy before bed!'],
    overMsg: (m, d) => `You drove ${nf(m)} m of sand and collected ${nf(d)} dates.`, newBest: 'New best!',
    sMetres: 'metres', sAir: 'seconds in the air', sBest: 'best run',
    o_swap: 'Dates turn into dirhams', partS: (d, c) => `${nf(d)} dates = ${nf(c)}`, partD: (m, c) => `${nf(m)} m = ${nf(c)}`, partA: (s, c) => `${s} s in the air = ${nf(c)}`,
    overCards: n => `New postcards this run: ${n}`,
    cardsTitle: 'Liwa postcards', cardsNote: (n, t) => `You have found ${n} of ${t}. Drive to a place to collect its postcard.`,
    garageTitle: 'Garage', garageNote: 'In-game dirhams only. There are no real payments.',
    c_red: 'Shemagh red', c_teal: 'Teal', c_yellow: 'Yellow', c_white: 'White', c_black: 'Black and gold',
    free: 'Free', buy: n => `Buy · ${nf(n)} AED`, use: 'Choose', using: 'Your buggy', notEnough: 'Not enough dirhams', bought: 'Bought!',
    tank: 'Bigger tank', tankD: n => `Extra fuel on every run · level ${n} of 3`, tankMax: 'Top level',
    mapTitle: 'Map of Liwa', mapNote: 'The red arrow is you. The small red dots are jerrycans.',
    helpTitle: 'How to play',
    help: ['Touch: put a finger anywhere and drag the way you want to go. Drag further to go faster.', 'Keyboard: arrow keys or WASD. Up is the accelerator, down brakes and reverses, left and right steer.',
      'Dunes have a gentle side and a steep side. Build speed up the gentle side and you fly off the crest.', 'Don\'t drive across a steep slope or land sideways. The buggy rolls and you lose fuel.',
      'Collect dates: every 10 dates is 1 dirham. A red jerrycan tops up the fuel.', 'There are 11 places on the map. The first time you reach one you get its postcard and dirhams.', 'The run ends when the fuel runs out.'],
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
