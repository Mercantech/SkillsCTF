const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { getChallenges, checkFlag } = require('./challenges');

const app = express();
const PORT = process.env.PORT || 3000;

// SSE: klienter der lytter på leaderboard-opdateringer (central skærm + spillere)
const sseClients = [];

function broadcastLeaderboardUpdate() {
  const msg = 'data: update\n\n';
  sseClients.forEach((res) => {
    try {
      res.write(msg);
    } catch (err) {
      // forbindelse lukket
    }
  });
}

app.use(cors());
app.use(express.json());

// Static frontend (served from public when built in Docker)
app.use(express.static(path.join(__dirname, 'public')));

// Custom header for "header" challenge
app.use((req, res, next) => {
  res.setHeader('X-Flag-Challenge', 'SKILLS{headers_are_cool}');
  next();
});

// Set cookie for "cookie" challenge (on first HTML load we set it via frontend; backend sets it on /api/cookie-visit)
app.get('/api/cookie-visit', (req, res) => {
  res.cookie('ctf_flag', 'SKILLS{cookies_are_yummy}', { httpOnly: false, maxAge: 86400000 });
  res.redirect('/');
});

// Fake secret endpoint for "url-param" challenge
app.get('/api/secret', (req, res) => {
  const key = (req.query.key || '').trim();
  if (key === 'flag') {
    return res.json({ success: true, flag: 'SKILLS{url_params_rule}' });
  }
  res.status(400).json({ error: 'Wrong key' });
});

// API: challenges
app.get('/api/challenges', (req, res) => {
  res.json(getChallenges());
});

// API: spillers løste opgaver (til tjektegn i oversigten)
app.get('/api/solves', async (req, res) => {
  const player = (req.query.player || '').trim().slice(0, 64);
  if (!player) return res.json([]);
  try {
    const ids = await db.getSolves(player);
    res.json(ids);
  } catch (e) {
    res.status(500).json([]);
  }
});

// API: leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const rows = await db.getLeaderboard();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// SSE: stream til live leaderboard-opdateringer (central skærm)
app.get('/api/leaderboard/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
});

// API: commit score (Afslut – gem point + tid på leaderboard)
app.post('/api/commit', async (req, res) => {
  const { playerName, timeSeconds } = req.body || {};
  const name = (playerName || 'Anonymous').trim().slice(0, 64) || 'Anonymous';
  const timeSec = Math.max(0, parseInt(timeSeconds, 10) || 0);
  try {
    const result = await db.commitScore(name, timeSec);
    if (!result.ok) return res.status(400).json({ success: false, message: 'Kunne ikke committe' });
    broadcastLeaderboardUpdate();
    return res.json({
      success: true,
      message: result.first ? 'Score gemt! Du er på leaderboard.' : (result.better ? 'Bedre score gemt!' : 'Score ikke bedre end sidst.'),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Serverfejl' });
  }
});

// API: submit flag
app.post('/api/submit', async (req, res) => {
  const { playerName, challengeId, flag } = req.body || {};
  if (!challengeId || !flag) {
    return res.status(400).json({ success: false, message: 'Missing challengeId or flag' });
  }
  const { ok, points } = checkFlag(challengeId, flag);
  if (!ok) {
    return res.json({ success: false, message: 'Forkert flag' });
  }
  const name = (playerName || 'Anonymous').trim().slice(0, 64) || 'Anonymous';
  try {
    await db.getOrCreatePlayer(name);
    const updated = await db.recordSolve(name, challengeId, points);
    if (updated) broadcastLeaderboardUpdate();
    res.json({ success: true, points, message: 'Korrekt! +' + points + ' point' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    await db.initDb();
    app.listen(PORT, () => console.log('Skills CTF backend on port', PORT));
  } catch (e) {
    console.error('DB init failed', e);
    process.exit(1);
  }
}

start();
