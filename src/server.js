require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

// --- Server & Environment Configuration ---
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
let twitchChannel = (process.env.TWITCH_CHANNEL || '').trim().replace(/^#/, '');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- Connected Clients ---
const clients = new Set();

function emit(data) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(payload);
      } catch (e) {
        console.error('[WS Emit Error]', e.message);
      }
    }
  }
}

// --- Game Engine State: Streamer, Boss, Predictions, Mutations ---

// 1. Controllable Streamer Cyber-Ship State
let streamer = {
  name: 'StreamerOne',
  maxHp: 1000,
  hp: 1000,
  maxShield: 500,
  shield: 500,
  isAlive: true,
  x: 960,
  y: 780,
  score: 0,
  deaths: 0,
  killer: null
};

// 2. Cyber-Boss State
let boss = {
  name: 'NEXUS-9 // OVERLORD CORE',
  maxHp: 6000,
  hp: 6000,
  maxShield: 2000,
  shield: 2000,
  phase: 1,
  phaseName: 'PHASE 1: SENTINEL',
  level: 1,
  isAlive: true,
  lastAttacker: 'None'
};

// 3. Live Combo Multiplier
let combo = {
  count: 0,
  multiplier: 1.0,
  lastHitTime: Date.now()
};

// 4. Live Twitch Crowd Prediction / Betting Engine
let prediction = {
  active: true,
  question: 'WILL STREAMER SURVIVE THE 60S RAID?',
  timer: 60,
  surviveSparks: 5400,
  ripSparks: 3600,
  bets: {}, // username -> { choice: 'survive'|'rip', amount: number }
  status: 'OPEN', // 'OPEN' | 'RESOLVED_SURVIVE' | 'RESOLVED_RIP'
  round: 1
};

// 5. Autonomous AI Game Director: Dynamic World Mutations
const WORLD_MUTATIONS = [
  {
    id: 'hyperdrive',
    name: 'HYPERDRIVE OVERCLOCK',
    desc: 'Hazards move 1.5x faster · 2x Raid XP multiplier active!',
    siren: 'Warning: Hyperdrive engaged. Speed limits deactivated.'
  },
  {
    id: 'quantum_gravity',
    name: 'QUANTUM LOW-GRAVITY',
    desc: 'Gravitational field disrupted · Curved drifting trajectories!',
    siren: 'Quantum fluctuations detected. Low gravity initiated.'
  },
  {
    id: 'neon_blackout',
    name: 'NEON BLACKOUT',
    desc: 'Arena power grid offline · Spotlight vision circle active!',
    siren: 'Power grid compromised. Entering blackout protocol.'
  },
  {
    id: 'solar_flare',
    name: 'SOLAR FLARE SURGE',
    desc: 'High radiation storm · Homing fireballs spawn with triple sparks!',
    siren: 'Solar flare reaching critical levels. Brace for plasma impact.'
  }
];

let activeMutation = {
  id: 'standard',
  name: 'STANDARD COMBAT MATRIX',
  desc: 'Normal arena physics active.',
  timer: 20
};

// 6. Leaderboard & Chat History
const leaderboard = {}; // username -> { username, xp, damage, kills, role, color }
const chatHistory = [];

const twitchStatus = {
  mode: twitchChannel && twitchChannel !== 'your_channel_name' ? 'twitch' : 'mock',
  channel: twitchChannel && twitchChannel !== 'your_channel_name' ? twitchChannel : null,
  connected: false,
  connecting: false,
  lastError: null
};

// --- Optional OpenAI live commentary (Node 18+ fetch; fully safe without a key) ---
const COMMENTARY_FALLBACKS = {
  roast: [
    'That dodge had all the urgency of a buffering emote.',
    'The arena sent a warning; the streamer filed it under maybe later.',
    'That move was so predictable the boss started yawning in advance.'
  ],
  hype: [
    'Chat is cooking so hard the arena just unlocked a new difficulty.',
    'That energy just put the boss health bar on notice.',
    'The crowd is so loud the cyber core is rattling.'
  ],
  boss: [
    'Your little victory is only a rounding error in my extinction algorithm.',
    'I have simulated your defeat in every timeline. This one is merely punctual.',
    'Core temperature rising. Your survival odds are now decorative.'
  ]
};
let openAiWarningShown = false;
function curatedCommentary(kind, context = '') {
  const lines = COMMENTARY_FALLBACKS[kind] || COMMENTARY_FALLBACKS.boss;
  const seed = String(context).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return lines[seed % lines.length];
}
async function generateCommentary(kind, context = '') {
  const fallback = curatedCommentary(kind, context);
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || typeof fetch !== 'function') return fallback;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a fast, funny cyberpunk Twitch stream commentator. Return exactly one short, stream-safe sentence. No slurs, no personal attacks, no markdown.' },
          { role: 'user', content: `${kind === 'boss' ? 'Write one menacing cybernetic boss taunt' : kind === 'roast' ? 'Write one playful streamer roast' : 'Write one energetic hype line'} for this live moment: ${String(context).slice(0, 180)}` }
        ],
        max_tokens: 60,
        temperature: 0.9
      }),
      signal: AbortSignal.timeout(2200)
    });
    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content || '').replace(/[\r\n]+/g, ' ').trim().replace(/^['"“”]+|['"“”]+$/g, '');
    if (!text) return fallback;
    return text.slice(0, 240);
  } catch (error) {
    if (!openAiWarningShown) {
      console.warn(`[OpenAI Commentary] Falling back to local lines: ${error.message}`);
      openAiWarningShown = true;
    }
    return fallback;
  }
}
function publishCommentary(kind, context, metadata = {}) {
  generateCommentary(kind, context).then(text => {
    if (kind === 'boss') {
      emit({ type: 'boss_taunt', text, announcement: text, ...metadata });
      return;
    }
    const style = kind === 'roast' ? 'roast' : 'hype';
    emit({ type: 'alert', style, title: kind === 'roast' ? 'ROAST FIRED!' : 'HYPE SURGE!', body: text, announcement: text, ...metadata });
  }).catch(error => {
    // Defensive last-resort guard: commentary must never interrupt chat processing.
    console.error('[Commentary Guard]', error.message);
  });
}
// --- Roles & Username Colors ---
const USER_COLORS = [
  '#00f0ff', '#ff007f', '#00ff88', '#ffbe0b', '#8a2be2',
  '#38bdf8', '#f43f5e', '#a855f7', '#ec4899', '#10b981'
];

function getUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getUserRole(username) {
  if (['Kai', 'Nova', 'StreamerAdmin'].includes(username)) return '[VIP]';
  if (['Mira', 'Vortex'].includes(username)) return '[MOD]';
  if (['ShadowFox', 'Glitch99'].includes(username)) return '[SUB]';
  return '[RAIDER]';
}

function recordUserActivity(username, damage = 0, xpGain = 10, isKill = false) {
  if (!leaderboard[username]) {
    leaderboard[username] = {
      username,
      xp: 0,
      damage: 0,
      kills: 0,
      role: getUserRole(username),
      color: getUserColor(username)
    };
  }
  leaderboard[username].damage += damage;
  leaderboard[username].xp += xpGain + Math.round(damage * 0.2);
  if (isKill) leaderboard[username].kills += 1;
}

function getTopLeaderboard(limit = 5) {
  return Object.values(leaderboard)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

// --- Live Prediction / Betting Countdown Loop ---
setInterval(() => {
  if (!prediction.active) return;

  prediction.timer--;
  emit({
    type: 'prediction_tick',
    timer: prediction.timer,
    surviveSparks: prediction.surviveSparks,
    ripSparks: prediction.ripSparks
  });

  if (prediction.timer <= 0) {
    // 60-Second Wave Timer Expired
    if (streamer.isAlive) {
      resolvePrediction('survive');
    } else {
      resolvePrediction('rip');
    }
  }
}, 1000);

function placeBet(username, choice, amount = 250) {
  const cleanChoice = choice.toLowerCase() === 'rip' ? 'rip' : 'survive';
  const val = Math.max(50, Math.min(amount || 250, 5000));

  prediction.bets[username] = { choice: cleanChoice, amount: val };
  if (cleanChoice === 'survive') prediction.surviveSparks += val;
  else prediction.ripSparks += val;

  recordUserActivity(username, 0, 40);
  emit({
    type: 'prediction_update',
    prediction,
    user: username,
    choice: cleanChoice,
    amount: val
  });
}

function resolvePrediction(outcome) {
  prediction.active = false;
  prediction.status = outcome === 'survive' ? 'RESOLVED_SURVIVE' : 'RESOLVED_RIP';

  let winTitle = '';
  let winDesc = '';

  if (outcome === 'survive') {
    winTitle = 'BELIEVERS WIN THE POT!';
    winDesc = `Streamer survived the 60s wave! ${prediction.surviveSparks} Sparks distributed to believers!`;
  } else {
    winTitle = 'DOUBTERS WIN THE POT!';
    winDesc = `Chat knocked out the streamer! ${prediction.ripSparks} Sparks distributed to doubters!`;
  }

  emit({
    type: 'prediction_resolved',
    outcome,
    winTitle,
    winDesc,
    announcement: winDesc
  });

  // Schedule Next Prediction Round in 8 seconds
  setTimeout(() => {
    prediction.round++;
    prediction.timer = 60;
    prediction.surviveSparks = 5000 + Math.floor(Math.random() * 2000);
    prediction.ripSparks = 4000 + Math.floor(Math.random() * 2000);
    prediction.bets = {};
    prediction.status = 'OPEN';
    prediction.active = true;

    // Also revive streamer if KO'd
    if (!streamer.isAlive) {
      streamer.isAlive = true;
      streamer.hp = streamer.maxHp;
      streamer.shield = streamer.maxShield;
      streamer.killer = null;
      emit({ type: 'streamer_revive', streamer });
    }

    emit({
      type: 'prediction_new_round',
      prediction,
      announcement: `New prediction round started! Will the streamer survive the next 60 seconds?`
    });
  }, 8000);
}

// --- Autonomous AI Game Director (Mutations Every 20s) ---
let mutationIndex = 0;
setInterval(() => {
  const chosen = WORLD_MUTATIONS[mutationIndex % WORLD_MUTATIONS.length];
  mutationIndex++;

  activeMutation = {
    ...chosen,
    timer: 20
  };

  emit({
    type: 'world_mutation',
    mutation: activeMutation,
    announcement: `AI Game Director Alert: ${chosen.name}! ${chosen.desc}`
  });
}, 20000);

// --- Streamer Damage & KO Mechanics ---
function damageStreamer(amount, attacker, weaponType) {
  if (!streamer.isAlive) return;

  let dmgToShield = 0;
  let dmgToHp = 0;

  if (streamer.shield > 0) {
    if (streamer.shield >= amount) {
      streamer.shield -= amount;
      dmgToShield = amount;
    } else {
      dmgToShield = streamer.shield;
      dmgToHp = amount - streamer.shield;
      streamer.shield = 0;
      streamer.hp = Math.max(0, streamer.hp - dmgToHp);
    }
  } else {
    dmgToHp = amount;
    streamer.hp = Math.max(0, streamer.hp - dmgToHp);
  }

  recordUserActivity(attacker, amount, 20);

  if (streamer.hp <= 0 && streamer.isAlive) {
    // STREAMER KNOCKED OUT!
    streamer.isAlive = false;
    streamer.hp = 0;
    streamer.shield = 0;
    streamer.deaths++;
    streamer.killer = attacker;

    recordUserActivity(attacker, 500, 500, true);

    // Trigger Holographic MVP Kill-Cam Trading Card
    const mvpCard = {
      username: attacker,
      role: getUserRole(attacker),
      color: getUserColor(attacker),
      title: 'STREAMER SLAYER // MVP',
      damage: leaderboard[attacker]?.damage || amount,
      winningCommand: weaponType || '!laser',
      rewardXP: 1000,
      timestamp: Date.now()
    };

    emit({
      type: 'mvp_card',
      mvp: mvpCard,
      announcement: `Streamer defeated! ${attacker} lands the knockout strike with ${weaponType}!`
    });

    emit({ type: 'streamer_ko', streamer, killer: attacker });

    // Settle prediction
    if (prediction.active) {
      resolvePrediction('rip');
    }
  } else {
    emit({ type: 'streamer_damaged', streamer, damage: amount, attacker });
  }
}

let bossLowTauntSent = false;
function strikeBoss(attacker, attackType) {
  if (!boss.isAlive) return;
  const damage = attackType === 'crit' ? 850 : 260;
  boss.hp = Math.max(0, boss.hp - damage);
  const ratio = boss.hp / boss.maxHp;
  const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
  const phaseChanged = nextPhase !== boss.phase;
  boss.phase = nextPhase;
  boss.phaseName = `PHASE ${nextPhase}: ${nextPhase === 1 ? 'SENTINEL' : nextPhase === 2 ? 'OVERDRIVE' : 'ENRAGED'}`;
  boss.lastAttacker = attacker;
  emit({ type: 'boss_update', boss, damage, attacker });
  if (phaseChanged) {
    emit({ type: 'boss_phase', boss, phase: nextPhase, announcement: `${boss.name} enters ${boss.phaseName}.` });
    publishCommentary('boss', `${boss.name} has entered ${boss.phaseName}; ${Math.round(ratio * 100)}% core integrity remains.`, { phase: nextPhase });
  }
  if (ratio <= 0.2 && !bossLowTauntSent) {
    bossLowTauntSent = true;
    publishCommentary('boss', `${boss.name} is critically damaged with ${Math.round(ratio * 100)}% core integrity remaining.`, { lowHp: true });
  }
  if (boss.hp === 0) {
    boss.isAlive = false;
    emit({ type: 'boss_defeat', boss, killer: attacker, announcement: `${attacker} landed the finishing blow!` });
    setTimeout(() => {
      boss.level++;
      boss.maxHp = Math.round(6000 * (1 + boss.level * 0.2));
      boss.hp = boss.maxHp;
      boss.phase = 1;
      boss.phaseName = 'PHASE 1: SENTINEL';
      boss.isAlive = true;
      bossLowTauntSent = false;
      emit({ type: 'boss_respawn', boss, announcement: `${boss.name} has reinitialized.` });
    }, 7000);
  }
}
// --- Live Chat & Command Processor ---
function processChatMessage(username, text, source = 'chat') {
  const cleanUser = String(username || 'viewer').trim().slice(0, 30);
  const cleanText = String(text || '').trim().slice(0, 400);
  if (!cleanText) return null;

  const userColor = getUserColor(cleanUser);
  const userRole = getUserRole(cleanUser);

  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: cleanUser,
    text: cleanText,
    role: userRole,
    color: userColor,
    source,
    timestamp: Date.now()
  };

  chatHistory.push(msg);
  if (chatHistory.length > 50) chatHistory.shift();
  emit({ type: 'chat', message: msg });

  // Command Routing
  if (cleanText.startsWith('!')) {
    const parts = cleanText.slice(1).split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const arg1 = parts[1] || '';
    const arg2 = parts[2] || '';

    // Betting Commands (!bet survive 500, !bet rip 500)
    if (cmd === 'bet') {
      const choice = arg1.toLowerCase();
      const amount = parseInt(arg2, 10) || 300;
      placeBet(cleanUser, choice, amount);
      return msg;
    }

    // Streamer Targeted Hazards
    if (['meteor', 'fireball'].includes(cmd)) {
      emit({
        type: 'hazard_spawn',
        hazardType: 'meteor',
        attacker: cleanUser,
        color: userColor
      });
      recordUserActivity(cleanUser, 200, 25);
    }
    else if (['laser', 'sniper'].includes(cmd)) {
      emit({
        type: 'hazard_spawn',
        hazardType: 'laser',
        attacker: cleanUser,
        color: userColor
      });
      recordUserActivity(cleanUser, 300, 30);
    }
    else if (['gravity', 'blackhole', 'vortex'].includes(cmd)) {
      emit({
        type: 'hazard_spawn',
        hazardType: 'gravity',
        attacker: cleanUser,
        color: userColor,
        duration: 7
      });
      recordUserActivity(cleanUser, 150, 40);
    }
    else if (['reverse', 'invert'].includes(cmd)) {
      emit({
        type: 'hazard_spawn',
        hazardType: 'reverse',
        attacker: cleanUser,
        color: userColor,
        duration: 6
      });
      recordUserActivity(cleanUser, 100, 50);
    }
    else if (['heal', 'repair', 'orb'].includes(cmd)) {
      emit({
        type: 'hazard_spawn',
        hazardType: 'heal',
        attacker: cleanUser,
        color: '#00ff88'
      });
      recordUserActivity(cleanUser, 0, 60);
    }
    else if (['attack', 'hit', 'plasma'].includes(cmd)) {
      // Hits boss or arena
      combo.count++;
      combo.multiplier = +(1.0 + Math.min(combo.count * 0.08, 4.0)).toFixed(1);
      combo.lastHitTime = Date.now();
      emit({
        type: 'hazard_spawn',
        hazardType: 'plasma',
        attacker: cleanUser,
        color: userColor
      });
      recordUserActivity(cleanUser, 150, 20);
      strikeBoss(cleanUser, 'attack');
    }
    else if (['emp', 'sonic', 'ultimate'].includes(cmd)) {
      emit({
        type: 'sonic_emp',
        attacker: cleanUser,
        announcement: `${cleanUser} triggered Sonic EMP Blast!`
      });
    }
    else if (['wheel'].includes(cmd)) {
      emit({
        type: 'wheel_spin',
        targetIndex: Math.floor(Math.random() * 8),
        penalty: 'Invert Mouse for 30s',
        triggeredBy: cleanUser,
        announcement: `${cleanUser} spun the Wheel of Chaos!`
      });
    }
    else if (['hype'].includes(cmd)) {
      publishCommentary('hype', `${cleanUser}: ${parts.slice(1).join(' ') || 'the crowd is hyping the arena'}`, { username: cleanUser });
    }
    else if (['roast'].includes(cmd)) {
      const roastContext = parts.slice(1).join(' ') || 'the streamer just dodged a chat hazard';
      publishCommentary('roast', `${cleanUser}: ${roastContext}`, { username: cleanUser });
    }
  }

  return msg;
}

// --- Crowd Chaos Auto-Simulator ---
let simulatorActive = true;
let simulatorInterval = null;

const SIM_USERS = [
  'Nova', 'Kai', 'Mira', 'Vortex', 'CyberSam', 'PixelQueen',
  'ShadowFox', 'Glitch99', 'NeonRider', 'AuraBot', 'AcesHigh', 'ZeroCool'
];

const SIM_ACTIONS = [
  { cmd: '!meteor', text: '!meteor take this homing fireball!' },
  { cmd: '!laser', text: '!laser sniper beam locked on streamer!' },
  { cmd: '!gravity', text: '!gravity black hole vortex!' },
  { cmd: '!reverse', text: '!reverse inverting streamer controls!' },
  { cmd: '!heal', text: '!heal green repair orb incoming' },
  { cmd: '!bet survive', text: '!bet survive 400' },
  { cmd: '!bet rip', text: '!bet rip 600' },
  { cmd: '!attack', text: '!attack firing plasma bolts!' },
  { cmd: '!hype', text: '!hype LETS GO CHAT!!' },
  { cmd: '!roast', text: '!roast nice try dodging that! 💀' }
];

function startAutoSimulator() {
  if (simulatorInterval) clearInterval(simulatorInterval);
  simulatorActive = true;
  simulatorInterval = setInterval(() => {
    if (!simulatorActive) return;
    const user = SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)];
    const pick = SIM_ACTIONS[Math.floor(Math.random() * SIM_ACTIONS.length)];
    processChatMessage(user, pick.text, 'auto_crowd');
  }, 1600);
}

function stopAutoSimulator() {
  simulatorActive = false;
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
}

// Enable auto-simulator by default so arena is immediately bursting with action
startAutoSimulator();

// --- Live Twitch Channel Bridge (tmi.js) with Dynamic 1-Click Connect ---
let tmiClient = null;

function connectTwitchChannel(targetChannel) {
  const clean = (targetChannel || '').trim().replace(/^#/, '').toLowerCase();
  if (!clean || clean === 'your_channel_name') {
    twitchStatus.mode = 'mock';
    twitchStatus.connected = false;
    twitchStatus.channel = null;
    emit({ type: 'twitch_status', ...twitchStatus });
    return false;
  }

  try {
    const tmi = require('tmi.js');

    if (tmiClient) {
      try { tmiClient.disconnect(); } catch (e) {}
      tmiClient = null;
    }

    twitchChannel = clean;
    twitchStatus.mode = 'twitch';
    twitchStatus.channel = clean;
    twitchStatus.connecting = true;
    twitchStatus.connected = false;
    emit({ type: 'twitch_status', ...twitchStatus });

    const opts = {
      options: { debug: false },
      connection: {
        secure: true,
        reconnect: true,
        maxReconnectAttempts: 10,
        maxReconnectInterval: 5000
      },
      channels: [clean]
    };

    if (process.env.TWITCH_USERNAME && process.env.TWITCH_OAUTH_TOKEN) {
      const token = process.env.TWITCH_OAUTH_TOKEN.trim();
      opts.identity = {
        username: process.env.TWITCH_USERNAME.trim(),
        password: token.startsWith('oauth:') ? token : `oauth:${token}`
      };
    }

    tmiClient = new tmi.Client(opts);

    tmiClient.on('connected', (addr, port) => {
      twitchStatus.connected = true;
      twitchStatus.connecting = false;
      twitchStatus.lastError = null;
      console.log(`[Twitch IRC] Connected to #${clean} at ${addr}:${port}`);
      emit({
        type: 'twitch_status',
        ...twitchStatus,
        announcement: `Connected to live Twitch channel: #${clean}!`
      });
    });

    tmiClient.on('disconnected', (reason) => {
      twitchStatus.connected = false;
      twitchStatus.connecting = false;
      emit({ type: 'twitch_status', ...twitchStatus });
    });

    tmiClient.on('message', (_channel, tags, message, self) => {
      if (self) return;
      const user = tags['display-name'] || tags.username || 'TwitchViewer';
      processChatMessage(user, message, 'twitch');
    });

    tmiClient.connect().catch(err => {
      console.warn(`[Twitch IRC Connect Failed] #${clean}: ${err.message}`);
      twitchStatus.connected = false;
      twitchStatus.connecting = false;
      twitchStatus.lastError = err.message;
      emit({ type: 'twitch_status', ...twitchStatus });
    });

    return true;
  } catch (err) {
    console.error('[Twitch Bridge Error]', err.message);
    twitchStatus.connected = false;
    twitchStatus.connecting = false;
    twitchStatus.lastError = err.message;
    emit({ type: 'twitch_status', ...twitchStatus });
    return false;
  }
}

// Initial Twitch connect if set in .env
if (twitchChannel && twitchChannel !== 'your_channel_name') {
  connectTwitchChannel(twitchChannel);
}

// --- WebSocket Server ---
wss.on('connection', (ws) => {
  clients.add(ws);

  // Send full initial game snapshot
  ws.send(JSON.stringify({
    type: 'snapshot',
    streamer,
    boss,
    combo,
    prediction,
    activeMutation,
    leaderboard: getTopLeaderboard(5),
    messages: chatHistory.slice(-25),
    simulatorActive,
    twitch: twitchStatus
  }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const action = data.action || data.type;

      if (action === 'streamer_hit') {
        damageStreamer(data.damage || 150, data.attacker || 'Hazard', data.weaponType || 'Hit');
      }
      else if (action === 'streamer_heal') {
        streamer.shield = Math.min(streamer.maxShield, streamer.shield + (data.amount || 200));
        emit({ type: 'streamer_healed', streamer, amount: data.amount });
      }
      else if (action === 'streamer_move') {
        streamer.x = data.x;
        streamer.y = data.y;
      }
      else if (action === 'sonic_emp') {
        emit({
          type: 'sonic_emp',
          attacker: data.user || 'Streamer',
          announcement: 'Sonic EMP Shockwave deployed!'
        });
      }
      else if (action === 'chat') {
        processChatMessage(data.user || 'Streamer', data.text, 'client');
      }
      else if (action === 'bet') {
        placeBet(data.user || 'Player', data.choice || 'survive', data.amount || 300);
      }
      else if (action === 'simulator_toggle') {
        if (simulatorActive) stopAutoSimulator();
        else startAutoSimulator();
        emit({ type: 'simulator_status', active: simulatorActive });
      }
      else if (action === 'connect_twitch') {
        connectTwitchChannel(data.channel);
      }
      else if (action === 'respawn_streamer') {
        streamer.isAlive = true;
        streamer.hp = streamer.maxHp;
        streamer.shield = streamer.maxShield;
        streamer.killer = null;
        emit({ type: 'streamer_revive', streamer });
      }
    } catch (e) {
      console.error('[WS Parse Error]', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// --- HTTP Routes ---
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/overlay', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/overlay.html'));
});

app.get('/dashboard', (_req, res) => {
  res.redirect('/');
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    streamer,
    boss,
    prediction,
    activeMutation,
    simulatorActive,
    clients: clients.size,
    twitch: twitchStatus,
    uptime: Math.round(process.uptime())
  });
});

app.get('/api/state', (_req, res) => {
  res.json({
    streamer,
    boss,
    combo,
    prediction,
    activeMutation,
    leaderboard: getTopLeaderboard(5),
    simulatorActive,
    twitch: twitchStatus
  });
});

app.post('/api/connect-twitch', (req, res) => {
  const { channel } = req.body || {};
  const ok = connectTwitchChannel(channel);
  res.json({ accepted: ok, twitch: twitchStatus });
});

app.post('/api/chat', (req, res) => {
  const { username, message } = req.body || {};
  const msg = processChatMessage(username, message);
  res.json({ accepted: true, message: msg });
});

app.post('/api/mock/chat', (req, res) => {
  const { username, message } = req.body || {};
  const msg = processChatMessage(username, message);
  res.json({ accepted: true, message: msg });
});

app.post('/api/action', (req, res) => {
  const { action, user } = req.body || {};
  processChatMessage(user || 'Player', `!${action}`);
  res.json({ accepted: true });
});

// --- Start Express & HTTP/WS Server ---
server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  CHAOS//ARENA: Grand Prize Broadcast Engine v3.0`);
  console.log(`  Unified Broadcast Studio: http://localhost:${PORT}/`);
  console.log(`  OBS Transparent Overlay:  http://localhost:${PORT}/overlay`);
  console.log(`  Health & State API:       http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});



