const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ctf:ctf_secret_2026@localhost:5432/skillsctf',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name VARCHAR(64) UNIQUE NOT NULL,
        total_points INT DEFAULT 0,
        points_at_commit INT DEFAULT NULL,
        time_seconds INT DEFAULT NULL,
        committed_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS solves (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(64) NOT NULL REFERENCES players(name) ON DELETE CASCADE,
        challenge_id VARCHAR(64) NOT NULL,
        solved_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(player_name, challenge_id)
      );
      CREATE INDEX IF NOT EXISTS idx_solves_player ON solves(player_name);
      CREATE INDEX IF NOT EXISTS idx_players_points ON players(total_points DESC);
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE players ADD COLUMN time_seconds INT DEFAULT NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE players ADD COLUMN committed_at TIMESTAMPTZ DEFAULT NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE players ADD COLUMN points_at_commit INT DEFAULT NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);
  } finally {
    client.release();
  }
};

const getLeaderboard = async () => {
  const { rows } = await pool.query(
    `SELECT name, COALESCE(points_at_commit, 0) AS total_points, time_seconds FROM players
     WHERE committed_at IS NOT NULL
     ORDER BY COALESCE(points_at_commit, 0) DESC, time_seconds ASC NULLS LAST
     LIMIT 100`
  );
  return rows;
};

const getOrCreatePlayer = async (name) => {
  const safeName = String(name).trim().slice(0, 64) || 'Anonymous';
  await pool.query(
    `INSERT INTO players (name, total_points) VALUES ($1, 0) ON CONFLICT (name) DO NOTHING`,
    [safeName]
  );
  const { rows } = await pool.query('SELECT id, name, total_points FROM players WHERE name = $1', [safeName]);
  return rows[0];
};

const recordSolve = async (playerName, challengeId, points) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount: inserted } = await client.query(
      `INSERT INTO solves (player_name, challenge_id) VALUES ($1, $2) ON CONFLICT (player_name, challenge_id) DO NOTHING`,
      [playerName, challengeId]
    );
    let updated = 0;
    if (inserted > 0) {
      const r = await client.query(
        `UPDATE players SET total_points = total_points + $1 WHERE name = $2`,
        [points, playerName]
      );
      updated = r.rowCount;
    }
    await client.query('COMMIT');
    return updated > 0;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const commitScore = async (playerName, timeSeconds) => {
  const safeName = String(playerName).trim().slice(0, 64) || 'Anonymous';
  await getOrCreatePlayer(safeName);
  const client = await pool.connect();
  try {
    const { rows: [row] } = await client.query(
      'SELECT total_points, points_at_commit, time_seconds, committed_at FROM players WHERE name = $1',
      [safeName]
    );
    if (!row) return { ok: false };
    const nowPoints = row.total_points;
    const timeSec = Math.max(0, parseInt(timeSeconds, 10) || 0);
    if (!row.committed_at) {
      await client.query(
        'UPDATE players SET points_at_commit = $1, time_seconds = $2, committed_at = NOW() WHERE name = $3',
        [nowPoints, timeSec, safeName]
      );
      return { ok: true, first: true };
    }
    const oldPoints = row.points_at_commit ?? 0;
    const oldTime = row.time_seconds ?? 999999;
    const better = nowPoints > oldPoints || (nowPoints === oldPoints && timeSec < oldTime);
    if (better) {
      await client.query(
        'UPDATE players SET points_at_commit = $1, time_seconds = $2, committed_at = NOW() WHERE name = $3',
        [nowPoints, timeSec, safeName]
      );
    }
    return { ok: true, first: false, better };
  } finally {
    client.release();
  }
};

const getSolves = async (playerName) => {
  const safeName = String(playerName).trim().slice(0, 64) || 'Anonymous';
  const { rows } = await pool.query(
    'SELECT challenge_id FROM solves WHERE player_name = $1 ORDER BY solved_at',
    [safeName]
  );
  return rows.map((r) => r.challenge_id);
};

module.exports = { pool, initDb, getLeaderboard, getOrCreatePlayer, recordSolve, commitScore, getSolves };
