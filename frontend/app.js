(function () {
  const API = '/api';
  const SESSION_KEY = 'ctf_session';

  document.cookie = 'ctf_flag=SKILLS{cookies_are_yummy}; path=/; max-age=86400; samesite=lax';

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && s.name && s.startTime) return s;
    } catch (e) {}
    return null;
  }

  function setSession(name, startTime) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: String(name).trim().slice(0, 64), startTime: startTime }));
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function getChallenges() {
    return fetch(API + '/challenges').then(function (r) { return r.json(); });
  }

  function getLeaderboard() {
    return fetch(API + '/leaderboard').then(function (r) { return r.json(); });
  }

  function getSolves(playerName) {
    if (!playerName) return Promise.resolve([]);
    return fetch(API + '/solves?player=' + encodeURIComponent(playerName)).then(function (r) { return r.json(); });
  }

  function submitFlag(playerName, challengeId, flag) {
    return fetch(API + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: playerName || 'Anonymous',
        challengeId: challengeId,
        flag: flag.trim(),
      }),
    }).then(function (r) { return r.json(); });
  }

  function commitScore(playerName, timeSeconds) {
    return fetch(API + '/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: playerName, timeSeconds: timeSeconds }),
    }).then(function (r) { return r.json(); });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatTime(seconds) {
    if (seconds == null || isNaN(seconds)) return '–';
    var m = Math.floor(Number(seconds) / 60);
    var s = Math.floor(Number(seconds) % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var challengeList = [];
  var timerInterval = null;

  var navTabs = document.querySelectorAll('.nav-tab');
  var screenLeaderboard = document.getElementById('screen-leaderboard');
  var screenTerminal = document.getElementById('screen-terminal');
  var terminalStartWrap = document.getElementById('terminal-start-wrap');
  var terminalWorkspace = document.getElementById('terminal-workspace');
  var headerToolbar = document.getElementById('header-toolbar');
  var startForm = document.getElementById('start-form');
  var startNameInput = document.getElementById('start-name');
  var terminalTimerEl = document.getElementById('terminal-timer');
  var btnCommit = document.getElementById('btn-commit');
  var playerNameInput = document.getElementById('player-name');

  function showScreen(name) {
    if (name === 'leaderboard') {
      screenLeaderboard.hidden = false;
      screenTerminal.hidden = true;
      screenLeaderboard.removeAttribute('hidden');
      screenTerminal.setAttribute('hidden', '');
      if (headerToolbar) { headerToolbar.hidden = true; headerToolbar.setAttribute('hidden', ''); }
    } else {
      screenLeaderboard.hidden = true;
      screenTerminal.hidden = false;
      screenLeaderboard.setAttribute('hidden', '');
      screenTerminal.removeAttribute('hidden');
      if (headerToolbar) { headerToolbar.hidden = true; headerToolbar.setAttribute('hidden', ''); }
      var session = getSession();
      if (session) {
        terminalStartWrap.hidden = true;
        terminalStartWrap.setAttribute('hidden', '');
        terminalWorkspace.hidden = false;
        terminalWorkspace.removeAttribute('hidden');
        if (headerToolbar) { headerToolbar.hidden = false; headerToolbar.removeAttribute('hidden'); }
        if (playerNameInput) playerNameInput.value = session.name;
      } else {
        terminalStartWrap.hidden = false;
        terminalStartWrap.removeAttribute('hidden');
        terminalWorkspace.hidden = true;
        terminalWorkspace.setAttribute('hidden', '');
        if (headerToolbar) { headerToolbar.hidden = true; headerToolbar.setAttribute('hidden', ''); }
      }
    }
    navTabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-screen') === name;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.body.classList.toggle('screen-leaderboard', name === 'leaderboard');
  }

  function startTimer() {
    var session = getSession();
    if (!session || !terminalTimerEl) return;
    function tick() {
      var session = getSession();
      if (!session) return;
      var elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      terminalTimerEl.textContent = formatTime(elapsed);
    }
    tick();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  navTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showScreen(tab.getAttribute('data-screen'));
      if (tab.getAttribute('data-screen') === 'terminal') startTimer();
    });
  });

  if (startForm) {
    startForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (startNameInput && startNameInput.value) ? startNameInput.value.trim() : '';
      if (!name) return;
      setSession(name, Date.now());
      if (terminalStartWrap) {
        terminalStartWrap.hidden = true;
        terminalStartWrap.setAttribute('hidden', '');
      }
      if (terminalWorkspace) {
        terminalWorkspace.hidden = false;
        terminalWorkspace.removeAttribute('hidden');
      }
      if (headerToolbar) { headerToolbar.hidden = false; headerToolbar.removeAttribute('hidden'); }
      if (playerNameInput) playerNameInput.value = name;
      startTimer();
      refreshSolvesThenRender();
    });
  }

  function resetForNewParticipant() {
    clearSession();
    if (terminalStartWrap) {
      terminalStartWrap.hidden = false;
      terminalStartWrap.removeAttribute('hidden');
    }
    if (terminalWorkspace) {
      terminalWorkspace.hidden = true;
      terminalWorkspace.setAttribute('hidden', '');
    }
    if (headerToolbar) {
      headerToolbar.hidden = true;
      headerToolbar.setAttribute('hidden', '');
    }
    if (startNameInput) startNameInput.value = '';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (terminalTimerEl) terminalTimerEl.textContent = '0:00';
    if (btnCommit) {
      btnCommit.disabled = false;
      btnCommit.textContent = 'AFSLUT & GEM SCORE';
    }
    if (submitOutput) { submitOutput.textContent = ''; submitOutput.className = 'terminal-output'; }
    if (flagInput) flagInput.value = '';
    if (hintBox) { hintBox.hidden = true; hintBox.setAttribute('hidden', ''); }
    if (btnHint) btnHint.textContent = 'Vis hint';
    hintVisibleCount = 0;
  }

  if (btnCommit) {
    btnCommit.addEventListener('click', function () {
      if (btnCommit.textContent === 'NÆSTE DELTAGER') {
        resetForNewParticipant();
        return;
      }
      var session = getSession();
      if (!session) return;
      var elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      btnCommit.disabled = true;
      btnCommit.textContent = 'Gemmer…';
      commitScore(session.name, elapsed).then(function (data) {
        if (data.success) {
          btnCommit.textContent = 'NÆSTE DELTAGER';
          btnCommit.disabled = false;
          refreshLeaderboard();
        } else {
          btnCommit.disabled = false;
          btnCommit.textContent = data.message || 'Fejl – prøv igen';
        }
      }).catch(function () {
        btnCommit.disabled = false;
        btnCommit.textContent = 'AFSLUT & GEM SCORE';
      });
    });
  }

  function renderLeaderboard(rows) {
    var tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">Ingen score endnu. Start på Terminal og tryk Afslut.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (row, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(row.name) + '</td><td>' + row.total_points + '</td><td>' + formatTime(row.time_seconds) + '</td></tr>';
    }).join('');
  }

  function refreshLeaderboard() {
    getLeaderboard().then(renderLeaderboard).catch(function () { renderLeaderboard([]); });
  }

  var challengeListEl = document.getElementById('challenge-list');
  var challengeDetailEl = document.getElementById('challenge-detail');
  var challengeDetailWrap = document.getElementById('challenge-detail-wrap');
  var fakeTerminalWrap = document.getElementById('fake-terminal-wrap');
  var fakeTerminalOutput = document.getElementById('fake-terminal-output');
  var fakeTerminalInput = document.getElementById('fake-terminal-input');
  var fakeTerminalPrompt = document.getElementById('fake-terminal-prompt');
  var challengeSelectValue = document.getElementById('challenge-select-value');
  var submitForm = document.getElementById('submit-form');
  var flagInput = document.getElementById('flag-input');
  var submitOutput = document.getElementById('submit-output');
  var btnHint = document.getElementById('btn-hint');
  var hintBox = document.getElementById('hint-box');
  var hintList = document.getElementById('hint-list');

  var solvedChallengeIds = {};

  function refreshSolvesThenRender() {
    var session = getSession();
    if (!session || !session.name) {
      renderChallengeList(challengeList);
      return;
    }
    getSolves(session.name).then(function (ids) {
      solvedChallengeIds = {};
      ids.forEach(function (id) { solvedChallengeIds[id] = true; });
      renderChallengeList(challengeList);
    }).catch(function () {
      renderChallengeList(challengeList);
    });
  }

  function renderChallengeList(list) {
    challengeList = list || [];
    if (!challengeListEl) return;

    challengeListEl.innerHTML = '';
    challengeList.forEach(function (c) {
      var item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.setAttribute('data-id', c.id);
      var check = solvedChallengeIds[c.id] ? '<span class="challenge-done" aria-label="Løst">✓</span>' : '';
      item.innerHTML = '<span class="challenge-list-title">' + check + escapeHtml(c.title) + '</span><div class="challenge-pts">' + c.points + ' pt</div>';
      item.addEventListener('click', function () {
        selectChallenge(c.id);
      });
      challengeListEl.appendChild(item);
    });

    if (challengeList.length > 0 && (!challengeSelectValue || !challengeSelectValue.value)) {
      selectChallenge(challengeList[0].id);
    }
  }

  function selectChallenge(id) {
    var c = challengeList.find(function (x) { return x.id === id; });
    if (!c) return;

    if (challengeSelectValue) challengeSelectValue.value = id;

    if (challengeListEl) {
      challengeListEl.querySelectorAll('[role="option"]').forEach(function (opt) {
        opt.classList.toggle('active', opt.getAttribute('data-id') === id);
      });
    }

    if (id === 'terminal') {
      if (challengeDetailWrap) challengeDetailWrap.hidden = true;
      if (fakeTerminalWrap) {
        fakeTerminalWrap.hidden = false;
        initFakeTerminal();
      }
    } else {
      if (challengeDetailWrap) challengeDetailWrap.hidden = false;
      if (fakeTerminalWrap) fakeTerminalWrap.hidden = true;
      var block = '<span class="terminal-prompt">$<span class="cursor-blink"></span></span> <span class="challenge-title">' + escapeHtml(c.title) + '</span> (' + c.points + ' pt)\n\n';
      block += '<span class="challenge-desc">' + escapeHtml(c.description) + '</span>';
      if (challengeDetailEl) challengeDetailEl.innerHTML = block;
    }
    if (hintBox) { hintBox.hidden = true; hintBox.setAttribute('hidden', ''); }
    hintVisibleCount = 0;
    if (btnHint) btnHint.textContent = 'Vis hint';
  }

  var hintVisibleCount = 0;

  function updateHintBox(visibleCount) {
    var id = challengeSelectValue ? challengeSelectValue.value : '';
    var c = challengeList.find(function (x) { return x.id === id; });
    if (!hintList) return;
    hintList.innerHTML = '';
    if (!c || !c.hints || c.hints.length === 0) {
      hintList.innerHTML = '<li class="hint-item">Ingen hints for denne opgave.</li>';
      return;
    }
    for (var i = 0; i < visibleCount && i < c.hints.length; i++) {
      var li = document.createElement('li');
      li.className = 'hint-item';
      li.textContent = c.hints[i];
      hintList.appendChild(li);
    }
  }

  function getHintButtonText(visibleCount, totalHints) {
    if (visibleCount === 0) return 'Vis hint';
    if (visibleCount < totalHints) return 'Vis hint ' + (visibleCount + 1);
    return 'Skjul hints';
  }

  function toggleHints() {
    if (!hintBox || !btnHint) return;
    var id = challengeSelectValue ? challengeSelectValue.value : '';
    var c = challengeList.find(function (x) { return x.id === id; });
    var total = (c && c.hints) ? c.hints.length : 0;
    if (hintBox.hidden && hintVisibleCount === 0) {
      hintVisibleCount = 1;
      hintBox.hidden = false;
      hintBox.removeAttribute('hidden');
      updateHintBox(hintVisibleCount);
      btnHint.textContent = getHintButtonText(hintVisibleCount, total);
      return;
    }
    if (hintVisibleCount < total) {
      hintVisibleCount++;
      updateHintBox(hintVisibleCount);
      btnHint.textContent = getHintButtonText(hintVisibleCount, total);
      return;
    }
    hintBox.hidden = true;
    hintBox.setAttribute('hidden', '');
    hintVisibleCount = 0;
    btnHint.textContent = 'Vis hint';
  }

  var fakeTerminalPath = [];
  var fakeTerminalFs = {
    'readme.txt': 'Velkommen til terminal-opgaven.\nBrug ls for at liste filer, cd <mappe> for at gå ind, cat <fil> for at læse.\n',
    'secret': {
      'flag.txt': 'SKILLS{linux_terminal_master}'
    }
  };

  function getFakeTerminalCwd() {
    var cur = fakeTerminalFs;
    for (var i = 0; i < fakeTerminalPath.length; i++) {
      cur = cur[fakeTerminalPath[i]];
      if (!cur || typeof cur !== 'object') return null;
    }
    return cur;
  }

  function runFakeTerminalCommand(line) {
    var parts = line.trim().split(/\s+/);
    var cmd = (parts[0] || '').toLowerCase();
    var cwd = getFakeTerminalCwd();
    if (!cwd) return 'fejl: ugyldig mappe';

    if (cmd === 'pwd') {
      if (fakeTerminalPath.length === 0) return '~';
      return '~/' + fakeTerminalPath.join('/');
    }
    if (cmd === 'ls') {
      var names = Object.keys(cwd);
      return names.map(function (n) {
        return typeof cwd[n] === 'object' ? n + '/' : n;
      }).join('  ') || '';
    }
    if (cmd === 'cd') {
      var target = (parts[1] || '').replace(/\/+$/, '');
      if (!target || target === '~') {
        fakeTerminalPath = [];
        return '';
      }
      if (target === '..') {
        if (fakeTerminalPath.length) fakeTerminalPath.pop();
        return '';
      }
      if (cwd[target] && typeof cwd[target] === 'object') {
        fakeTerminalPath.push(target);
        return '';
      }
      return 'cd: ' + (parts[1] || target) + ': Ingen sådan mappe';
    }
    if (cmd === 'cat') {
      var file = (parts[1] || '').replace(/\/+$/, '');
      if (!file) return 'cat: mangler filnavn';
      if (cwd[file] === undefined) return 'cat: ' + (parts[1] || file) + ': Fil eller mappe findes ikke';
      if (typeof cwd[file] === 'object') return 'cat: ' + (parts[1] || file) + ': Er en mappe';
      return cwd[file];
    }
    if (cmd === 'clear') return '\x0c';
    if (cmd === 'help') return 'Kommandoer: ls, cd <mappe>, cat <fil>, pwd, clear';
    return 'Kommando ikke fundet: ' + parts[0] + '. Prøv help.';
  }

  var FAKE_TERMINAL_COMMANDS = ['ls', 'cd', 'cat', 'pwd', 'clear', 'help'];

  function getFakeTerminalPrompt() {
    if (fakeTerminalPath.length === 0) return 'ctf@skills:~$';
    return 'ctf@skills:~/' + fakeTerminalPath.join('/') + '$';
  }

  function getFakeTerminalPromptEscaped() {
    return escapeHtml(getFakeTerminalPrompt());
  }

  function getTokenAtCursor(input) {
    var line = input.value;
    var pos = input.selectionStart || 0;
    var start = pos;
    var end = pos;
    while (start > 0 && line[start - 1] !== ' ') start--;
    while (end < line.length && line[end] !== ' ') end++;
    var beforeCursor = line.slice(0, start);
    var isFirstToken = beforeCursor.search(/\s/) === -1;
    return { token: line.slice(start, end), start: start, end: end, isFirstToken: isFirstToken };
  }

  function getFakeTerminalCompletions(prefix, isFirstToken) {
    if (isFirstToken) {
      return FAKE_TERMINAL_COMMANDS.filter(function (c) { return c.indexOf(prefix) === 0; });
    }
    var cwd = getFakeTerminalCwd();
    if (!cwd) return [];
    var names = Object.keys(cwd);
    return names.filter(function (n) { return n.indexOf(prefix) === 0; }).map(function (n) {
      return { name: n, isDir: typeof cwd[n] === 'object' };
    });
  }

  function commonPrefix(arr) {
    if (arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    var first = arr[0];
    var i = 0;
    while (i < first.length) {
      var c = first[i];
      for (var j = 1; j < arr.length; j++) {
        if (i >= arr[j].length || arr[j][i] !== c) return first.slice(0, i);
      }
      i++;
    }
    return first;
  }

  function handleFakeTerminalTab() {
    if (!fakeTerminalInput) return;
    var input = fakeTerminalInput;
    var info = getTokenAtCursor(input);
    var prefix = info.token;
    var isFirst = info.isFirstToken;
    var cmdCompletions = isFirst ? getFakeTerminalCompletions(prefix, true) : [];
    var pathCompletions = isFirst ? [] : getFakeTerminalCompletions(prefix, false);
    var names = isFirst ? cmdCompletions : pathCompletions.map(function (x) { return x.name; });
    if (names.length === 0) return;
    var line = input.value;
    var newToken;
    if (names.length === 1) {
      if (isFirst) {
        newToken = cmdCompletions[0];
      } else {
        var one = pathCompletions[0];
        newToken = one.isDir ? one.name + '/' : one.name;
      }
    } else {
      newToken = commonPrefix(names);
    }
    if (newToken === prefix && names.length > 1) {
      if (fakeTerminalOutput) {
        var list = pathCompletions.length
          ? pathCompletions.map(function (p) { return p.name + (p.isDir ? '/' : ''); }).join('  ')
          : names.join('  ');
        appendFakeTerminalHtml(list, 'fake-terminal-completion-list');
      }
      return;
    }
    var newLine = line.slice(0, info.start) + newToken + line.slice(info.end);
    input.value = newLine;
    input.setSelectionRange(info.start + newToken.length, info.start + newToken.length);
  }

  function appendFakeTerminal(text) {
    if (!fakeTerminalOutput) return;
    if (text === '\x0c') {
      fakeTerminalOutput.innerHTML = '';
      return;
    }
    var span = document.createElement('span');
    span.textContent = text;
    span.className = 'fake-terminal-line';
    if (fakeTerminalOutput.innerHTML) {
      fakeTerminalOutput.appendChild(document.createTextNode('\n'));
    }
    fakeTerminalOutput.appendChild(span);
    fakeTerminalOutput.scrollTop = fakeTerminalOutput.scrollHeight;
  }

  function appendFakeTerminalHtml(html, className) {
    if (!fakeTerminalOutput) return;
    if (html === '\x0c') {
      fakeTerminalOutput.innerHTML = '';
      return;
    }
    var span = document.createElement('span');
    span.className = 'fake-terminal-line' + (className ? ' ' + className : '');
    span.innerHTML = html;
    if (fakeTerminalOutput.children.length) {
      fakeTerminalOutput.appendChild(document.createTextNode('\n'));
    }
    fakeTerminalOutput.appendChild(span);
    fakeTerminalOutput.scrollTop = fakeTerminalOutput.scrollHeight;
  }

  function initFakeTerminal() {
    fakeTerminalPath = [];
    if (fakeTerminalOutput) {
      fakeTerminalOutput.innerHTML = '';
      var welcome = document.createElement('span');
      welcome.className = 'fake-terminal-line fake-terminal-welcome';
      welcome.textContent = 'Velkommen. Prøv ls, cd og cat. Tab = auto-complete. Skriv help for hjælp.';
      fakeTerminalOutput.appendChild(welcome);
    }
    if (fakeTerminalPrompt) fakeTerminalPrompt.textContent = getFakeTerminalPrompt();
    if (fakeTerminalInput) {
      fakeTerminalInput.value = '';
      fakeTerminalInput.focus();
    }
  }

  function onFakeTerminalSubmit() {
    if (!fakeTerminalInput || !fakeTerminalOutput) return;
    var line = fakeTerminalInput.value;
    fakeTerminalInput.value = '';
    if (!line.trim()) return;
    var promptStr = getFakeTerminalPromptEscaped();
    appendFakeTerminalHtml('<span class="fake-terminal-prompt-out">' + promptStr + '</span> ' + escapeHtml(line), 'fake-terminal-cmdline');
    var out = runFakeTerminalCommand(line);
    if (out) appendFakeTerminal(out);
    if (fakeTerminalPrompt) fakeTerminalPrompt.textContent = getFakeTerminalPrompt();
    fakeTerminalInput.focus();
  }

  if (fakeTerminalInput) {
    fakeTerminalInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onFakeTerminalSubmit();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleFakeTerminalTab();
      }
    });
  }

  function showOutput(text, success) {
    if (!submitOutput) return;
    submitOutput.textContent = text;
    submitOutput.className = 'terminal-output ' + (success ? 'success' : 'error');
  }

  function runTerminalCommand(cmd) {
      var session = getSession();
      var name = session ? session.name : 'anonymous';
      var c = cmd.toLowerCase().trim();
      if (c === 'help') {
        return 'Kommandoer: help, ls, whoami, date, echo <tekst>, clear\nIndsend flag som SKILLS{...} for at indsende.';
      }
      if (c === 'ls') {
        return 'challenges/\nflag.txt\nreadme.md\nsecret/';
      }
      if (c === 'whoami') {
        return name;
      }
      if (c === 'date') {
        return new Date().toLocaleString('da-DK');
      }
      if (c === 'clear') {
        if (submitOutput) { submitOutput.textContent = ''; submitOutput.className = 'terminal-output'; }
        return null;
      }
      if (c.indexOf('echo ') === 0) {
        return cmd.slice(5).trim() || '';
      }
      return undefined;
    }

  if (btnHint) {
    btnHint.addEventListener('click', function () { toggleHints(); });
  }

  if (submitForm) {
    submitForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var session = getSession();
      var playerName = session ? session.name : ((playerNameInput && playerNameInput.value) ? playerNameInput.value.trim() : '');
      var challengeId = challengeSelectValue ? challengeSelectValue.value : '';
      var raw = (flagInput && flagInput.value) ? flagInput.value.trim() : '';
      if (!raw) {
        showOutput('Indtast flag (SKILLS{...}) eller en kommando.', false);
        return;
      }

      var cmdOut = runTerminalCommand(raw);
      if (cmdOut !== undefined) {
        if (cmdOut !== null) showOutput(cmdOut, true);
        if (flagInput) flagInput.value = '';
        return;
      }

      if (!challengeId) {
        showOutput('Vælg en opgave først.', false);
        return;
      }

      showOutput('Sender…', true);

      submitFlag(playerName, challengeId, raw).then(function (data) {
        if (data.success) {
          solvedChallengeIds[challengeId] = true;
          renderChallengeList(challengeList);
          showOutput(data.message || 'Korrekt! +' + data.points + ' point', true);
          if (flagInput) flagInput.value = '';
          refreshLeaderboard();
        } else {
          showOutput(data.message || 'Forkert flag.', false);
        }
      }).catch(function () {
        showOutput('Netværksfejl. Prøv igen.', false);
      });
    });
  }

  getChallenges().then(function (list) {
    renderChallengeList(list || []);
    refreshSolvesThenRender();
  }).catch(function () { renderChallengeList([]); });
  refreshLeaderboard();

  (function initLeaderboardStream() {
    var streamUrl = API + '/leaderboard/stream';
    var es = null;
    function connect() {
      try {
        es = new EventSource(streamUrl);
        es.onmessage = function () { refreshLeaderboard(); };
        es.onerror = function () {
          if (es) { es.close(); es = null; }
          setTimeout(connect, 3000);
        };
      } catch (e) {
        setTimeout(connect, 3000);
      }
    }
    connect();
    setInterval(refreshLeaderboard, 30000);
  })();

  (function initHackerTerminals() {
    var MAX_LINES = 14;
    var TYPEWRITER_MS = 2;
    var typingNow = {};
    var leftLines = [
      'sys@skillsctf:~$ nmap -sC -sV -p- 10.0.0.0/24 2>/dev/null | tee scan.log',
      '[*] Nmap scan report for 10.0.0.1',
      '22/tcp   open  ssh     OpenSSH 8.9',
      '3000/tcp open  http    Node.js Express',
      'sys@skillsctf:~$ curl -sL skillsctf.local/api/challenges | jq ".[].id"',
      '"view-source"',
      '"base64" "url-param" "hidden-div" "console"',
      'sys@skillsctf:~$ cat payload.bin | base64 -d | xxd | head -20',
      '00000000: 534b 494c 4c53 7b2e 2e2e 7d0a          SKILLS{...}.',
      'sys@skillsctf:~$ find /var/www -name "*.conf" -exec grep -l flag {} \\; 2>/dev/null',
      '/var/www/ctf/config.inc.php',
      'sys@skillsctf:~$ hydra -L users.txt -P rockyou.txt 10.0.0.1 ssh -t 4',
      '<span class="warn">[!] 22/tcp open - 47 attempts</span>',
      'sys@skillsctf:~$ python3 exploit.py --target 10.0.0.1 --port 3000',
      '[+] Sending payload... <span class="ok">shell</span>',
      'sys@skillsctf:~$ ss -tlnp | grep -E "3000|443"',
      'LISTEN  0  128  *:3000  *:*  users:(("node",pid=1))',
      'sys@skillsctf:~$ ps aux | grep -E "node|nginx" | grep -v grep',
      'root  1  0.1  2.3  node server.js',
      'sys@skillsctf:~$ curl -s skillsctf.local/api/leaderboard | jq "length"',
      '12',
      'sys@skillsctf:~$ _',
    ];
    var leftLogLines = [
      '<span class="muted">[LOG]</span> New connection from 10.0.0.42:51234',
      '<span class="muted">[LOG]</span> Flag submitted: view-source (player_7)',
      '<span class="ok">[OK]</span> Solve verified SKILLS{...}',
      '<span class="muted">[LOG]</span> Leaderboard broadcast to 8 clients',
      '<span class="warn">[WARN]</span> Rate limit check 10.0.0.42 (ok)',
      '<span class="muted">[LOG]</span> Session heartbeat 127.0.0.1',
      '<span class="ok">[OK]</span> Commit received: Alice 340pts 00:12:04',
      '<span class="muted">[LOG]</span> GET /api/challenges 200 2ms',
      '<span class="muted">[LOG]</span> SSE client connected (total: 5)',
      '<span class="ok">[OK]</span> Solve verified cookie (player_3)',
      '<span class="muted">[LOG]</span> POST /api/submit 200 12ms',
      '<span class="warn">[WARN]</span> Invalid flag attempt from 10.0.0.99',
      '<span class="muted">[LOG]</span> Database pool: 2 active',
    ];
    var rightLines = [
      'root@ctf:~# cat /etc/ctf.conf | grep -v "^#"',
      'MODE=live',
      'FLAG_FORMAT=SKILLS{}',
      'DB_HOST=db',
      'root@ctf:~# tail -n 50 /var/log/ctf.log | grep -E "solve|commit"',
      '<span class="ok">[solve]</span> player_2 base64 2026-02-19T10:23:01',
      '<span class="ok">[commit]</span> Bob 280 00:08:44',
      'root@ctf:~# netstat -tlnp | grep LISTEN',
      'tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  1/node',
      'tcp  0  0 0.0.0.0:5432  0.0.0.0:*  LISTEN  12/postgres',
      'root@ctf:~# ps aux | awk \'{print $11,$12}\' | grep node',
      'node server.js',
      'root@ctf:~# curl -s localhost:3000/api/status | jq .',
      '{"ctf":"active","uptime":3600,"players":6}',
      'root@ctf:~# docker ps --format "table {{.Names}}\t{{.Status}}"',
      'skillsctf-backend-1  Up 2 hours',
      'skillsctf-db-1       Up 2 hours (healthy)',
      'root@ctf:~# grep -r "SKILLS{" /app/challenges/ 2>/dev/null | head -1',
      '<span class="muted">(binary/encrypted)</span>',
      'root@ctf:~# nc -lvp 4444 -e /bin/bash',
      '<span class="ok">listening on [any] 4444</span>',
      'root@ctf:~# _',
    ];
    var rightMonLines = [
      '> ping -c 3 skillsctf.local',
      '64 bytes from 10.0.0.1: seq=0 ttl=64 time=0.12 ms',
      '64 bytes from 10.0.0.1: seq=1 ttl=64 time=0.09 ms',
      '> trace skillsctf.local',
      '<span class="muted">1  10.0.0.1  0.5ms</span>',
      '> status --json',
      '<span class="ok">{"api":"up","db":"up","sse":5}</span>',
      '> load',
      '<span class="muted">0.24 0.18 0.12 2/128 4120</span>',
      '> connections',
      '<span class="muted">tcp: 14  established: 8  listen: 2</span>',
      '> disk /var/log',
      '<span class="muted">4.2G used  12G total</span>',
      '> mem',
      '<span class="ok">free: 1.2G  cache: 512M</span>',
    ];
    var idx = { left: 0, leftLog: 0, right: 0, rightMon: 0 };
    function stripHtml(s) {
      var div = document.createElement('div');
      div.innerHTML = s;
      return div.textContent || div.innerText || '';
    }
    function appendLine(el, lines, idxKey, useTypewriter) {
      if (!el) return;
      var i = idx[idxKey] % lines.length;
      idx[idxKey] = i + 1;
      var line = lines[i];
      var current = el.innerHTML || '';
      var arr = current.split('\n').filter(Boolean);
      if (useTypewriter && line.indexOf('<') === -1 && !typingNow[el.id]) {
        arr.push('');
        if (arr.length > MAX_LINES) arr.shift();
        var lineIdx = arr.length - 1;
        var charIndex = 0;
        typingNow[el.id] = true;
        function typeNext() {
          if (charIndex < line.length) {
            arr[lineIdx] = line.slice(0, charIndex + 1);
            el.innerHTML = arr.join('\n');
            el.scrollTop = el.scrollHeight;
            charIndex++;
            setTimeout(typeNext, TYPEWRITER_MS);
          } else {
            typingNow[el.id] = false;
          }
        }
        typeNext();
      } else {
        arr.push(line);
        if (arr.length > MAX_LINES) arr.shift();
        el.innerHTML = arr.join('\n');
      }
      el.scrollTop = el.scrollHeight;
    }
    var terminals = [
      { id: 'hacker-terminal-left', lines: leftLines, key: 'left', typewriter: true },
      { id: 'hacker-terminal-left-log', lines: leftLogLines, key: 'leftLog', typewriter: false },
      { id: 'hacker-terminal-right', lines: rightLines, key: 'right', typewriter: true },
      { id: 'hacker-terminal-right-mon', lines: rightMonLines, key: 'rightMon', typewriter: false },
    ];
    var termIndex = 0;
    function tickOne() {
      var t = terminals[termIndex % terminals.length];
      termIndex++;
      var el = document.getElementById(t.id);
      appendLine(el, t.lines, t.key, t.typewriter);
    }
    function seedAll() {
      var elLeft = document.getElementById('hacker-terminal-left');
      var elLeftLog = document.getElementById('hacker-terminal-left-log');
      var elRight = document.getElementById('hacker-terminal-right');
      var elRightMon = document.getElementById('hacker-terminal-right-mon');
      if (elLeft) elLeft.innerHTML = 'sys@skillsctf:~$ <span class="muted">connecting...</span>';
      if (elLeftLog) elLeftLog.innerHTML = '<span class="muted">[LOG]</span> CTF system ready';
      if (elRight) elRight.innerHTML = 'root@ctf:~# <span class="muted">booting</span>';
      if (elRightMon) elRightMon.innerHTML = '> <span class="ok">connected</span>';
    }
    seedAll();
    setInterval(tickOne, 95);
    setTimeout(tickOne, 50);
    setTimeout(tickOne, 120);
    setTimeout(tickOne, 200);
  })();

  showScreen('leaderboard');
})();
