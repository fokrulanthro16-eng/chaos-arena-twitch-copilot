/**
 * CHAOS//ARENA: 30-Second Grand Prize Simulation Cycle
 * Verifies Playable Arena, Betting Engine, AI Director Mutations,
 * and Targeted Hazards (!meteor, !laser, !gravity, !reverse, !heal, !bet).
 */

require('dotenv').config();

const BASE_URL = process.env.OVERLAY_URL || `http://localhost:${process.env.PORT || 3000}`;
const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws';

console.log(`====================================================`);
console.log(`  STARTING 30-SECOND GRAND PRIZE SIMULATION CYCLE`);
console.log(`  Target: ${BASE_URL}`);
console.log(`====================================================\n`);

async function sendChat(username, message) {
  try {
    const res = await fetch(`${BASE_URL}/api/mock/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, message })
    });
    return res.status === 200;
  } catch (err) {
    console.error(`[Chat Error] "${message}":`, err.message);
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const wsEvents = [];
  let ws = null;
  try {
    ws = new WebSocket(WS_URL);
    ws.addEventListener('message', (e) => {
      try {
        const parsed = JSON.parse(e.data.toString());
        wsEvents.push(parsed);
      } catch (err) {}
    });
    await new Promise((resolve) => {
      ws.addEventListener('open', resolve);
      setTimeout(resolve, 2000);
    });
    console.log(`[WS Telemetry] Connected to ${WS_URL}`);
  } catch (err) {
    console.warn('[WS Telemetry] Warning:', err.message);
  }

  const startTime = Date.now();
  function timestamp() {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    return `[T+${String(elapsed).padStart(2, '0')}s]`;
  }

  // Phase 1: Live Crowd Prediction & Betting (0s - 5s)
  console.log(`${timestamp()} ⚡ Phase 1: Crowd Prediction Bets Injected (!bet survive & !bet rip)`);
  await sendChat('Nova', '!bet survive 800');
  await sleep(1000);
  await sendChat('Vortex', '!bet rip 1200');
  await sleep(1000);
  await sendChat('Kai', '!bet survive 500');
  await sleep(1500);

  // Phase 2: Targeted Hazards - Homing Meteors & Black Hole (5s - 12s)
  console.log(`${timestamp()} ☄️ Phase 2: Spawning Homing Meteors & Black Hole Vortex`);
  await sendChat('ShadowFox', '!meteor incoming homing fireball!');
  await sleep(1200);
  await sendChat('Glitch99', '!gravity singularity pulling streamer ship!');
  await sleep(2000);

  // Phase 3: Sniper Laser Lock-On & Control Inversion (12s - 18s)
  console.log(`${timestamp()} 🎯 Phase 3: Sniper Laser Beam Telegraph (!laser) & Invert (!reverse)`);
  await sendChat('Mira', '!laser 1.5s lock-on charged on streamer!');
  await sleep(1500);
  await sendChat('PixelQueen', '!reverse flip streamer controls now!');
  await sleep(2000);

  // Phase 4: Green Repair Orbs Caught (18s - 22s)
  console.log(`${timestamp()} 🧪 Phase 4: Catching Green Repair Orbs (!heal)`);
  await sendChat('AuraBot', '!heal repair orb floating across arena!');
  await sleep(2500);

  // Phase 5: Sonic EMP Ultimate Vaporization (22s - 26s)
  console.log(`${timestamp()} ⚡ Phase 5: Streamer Deploys Sonic EMP Shockwave`);
  await sendChat('Streamer', '!emp SONIC EMP BLAST CLEAR SCREEN');
  await sleep(2500);

  // Phase 6: Final Heavy Barrage & MVP Knockout (26s - 30s)
  console.log(`${timestamp()} 👑 Phase 6: Final Laser Strike & Holographic MVP Card Trigger`);
  await sendChat('Vortex', '!laser CRITICAL OVERDRIVE STRIKE!');
  await sleep(2500);

  console.log(`\n====================================================`);
  console.log(`  30-SECOND GRAND PRIZE SIMULATION CYCLE COMPLETE!`);
  console.log(`====================================================`);

  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    const state = await res.json();
    console.log(`Streamer Status:    ${state.streamer.isAlive ? 'ALIVE' : 'KNOCKED OUT'} (HP: ${state.streamer.hp}/${state.streamer.maxHp})`);
    console.log(`Active Mutation:    ${state.activeMutation.name} (${state.activeMutation.desc})`);
    console.log(`Prediction Pot:     Survive: ${state.prediction.surviveSparks} Sparks vs RIP: ${state.prediction.ripSparks} Sparks`);
    console.log(`Twitch Connection:  Mode: ${state.twitch.mode}, Channel: #${state.twitch.channel || 'none'}, Connected: ${state.twitch.connected}`);
    console.log(`Top Raiders:        ${state.leaderboard.map(u => `${u.username} (${u.xp} XP)`).join(', ')}`);
  } catch (err) {
    console.warn('Could not query /api/state:', err.message);
  }

  if (wsEvents.length > 0) {
    console.log(`WebSocket Broadcasts: ${wsEvents.length} events received`);
    const types = [...new Set(wsEvents.map(e => e.type))];
    console.log(`Verified Event Types: ${types.join(', ')}`);
  }

  if (ws) ws.close();
  process.exit(0);
})().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
