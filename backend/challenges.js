// Challenge definitions: id, title, description, points, flag (server-side check), hints (2 per opgave)
const CHALLENGES = [
  {
    id: 'source',
    title: 'View Source',
    description: 'Flaggen er gemt i siden. Find den via "View Page Source" eller Inspect.',
    points: 50,
    flag: 'SKILLS{view_source_is_fun}',
    hints: ['Højreklik på siden og vælg "Vis kildeside" (eller Ctrl+U).', 'Søg i HTML-koden efter SKILLS eller en kommentar.'],
  },
  {
    id: 'base64',
    title: 'Base64',
    description: 'Decode denne streng: U0tJTExTe2Jhc2U2NF9pc19leWVzfQ==',
    points: 75,
    flag: 'SKILLS{base64_is_eyes}',
    hints: ['Base64 er en måde at kode tekst på. Søg efter "base64 decode" online.', 'Paste strengen ind i en base64-decoder og se resultatet.'],
  },
  {
    id: 'url-param',
    title: 'URL Parameter',
    description: 'Siden /api/secret accepterer en parameter "key". Prøv key=flag.',
    points: 75,
    flag: 'SKILLS{url_params_rule}',
    hints: ['Prøv at åbne /api/secret i browseren med et query parameter.', 'URL-parametre skrives som ?navn=værdi – fx ?key=flag'],
  },
  {
    id: 'hidden-div',
    title: 'Hidden Div',
    description: 'Et skjult element på siden indeholder flaget. Brug Developer Tools.',
    points: 50,
    flag: 'SKILLS{inspect_element}',
    hints: ['Højreklik på siden og vælg "Inspicer" eller "Inspect element".', 'Kig i DOM-træet efter elementer der er skjulte eller har særlige id/klasser.'],
  },
  {
    id: 'console',
    title: 'Console',
    description: 'Åbn JavaScript-konsollen (F12) og find hintet der fører til flaget.',
    points: 100,
    flag: 'SKILLS{console_log_winner}',
    hints: ['Åbn udviklerværktøjer (F12) og vælg fanen "Console".', 'Konsollen viser ofte beskeder fra siden – kig efter CTF eller flag.'],
  },
  {
    id: 'cookie',
    title: 'Cookie',
    description: 'Tjek cookies for denne side. En cookie indeholder flaget.',
    points: 75,
    flag: 'SKILLS{cookies_are_yummy}',
    hints: ['Åbn DevTools (F12) → Application (eller Storage) → Cookies.', 'Vælg denne side og gennemse cookie-navne og -værdier.'],
  },
  {
    id: 'rot13',
    title: 'ROT13',
    description: 'Decode med ROT13: FXVYYF{ebg13_vf_snfg}',
    points: 100,
    flag: 'SKILLS{rot13_is_fast}',
    hints: ['ROT13 erstatter hver bogstav med det 13. bogstav i alfabetet (a→n, b→o osv.).', 'Søg efter "ROT13 decoder" eller brug en kommando/script.'],
  },
  {
    id: 'header',
    title: 'HTTP Header',
    description: 'Tjek respons-headers fra serveren. Et custom header har flaget.',
    points: 100,
    flag: 'SKILLS{headers_are_cool}',
    hints: ['Når du loader en side, sender serveren "headers" med. Brug Netværk-fanen i DevTools.', 'Find request til dokumentet og se under "Response Headers" for et custom header.'],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Brug terminalen nedenfor. Udforsk med cd og ls, og læs filer med cat. Find flaget og indsend det.',
    points: 100,
    flag: 'SKILLS{linux_terminal_master}',
    hints: ['Brug ls for at se filer og mapper, cd <mappe> for at gå ind, cat <fil> for at læse.', 'Der findes en mappe med et hemmeligt navn – og en fil med flaget i.'],
  },
];

function getChallenges() {
  return CHALLENGES.map(({ id, title, description, points, hints }) => ({ id, title, description, points, hints: hints || [] }));
}

function checkFlag(challengeId, submittedFlag) {
  const c = CHALLENGES.find((x) => x.id === challengeId);
  if (!c) return { ok: false, message: 'Unknown challenge' };
  const ok = submittedFlag && String(submittedFlag).trim() === c.flag;
  return { ok, points: ok ? c.points : 0 };
}

module.exports = { CHALLENGES, getChallenges, checkFlag };
