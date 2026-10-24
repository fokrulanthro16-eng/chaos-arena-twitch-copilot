'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const screenshotDir = path.join(root, 'docs', 'screenshots');
const demoDir = path.join(root, 'demo');
const captureDir = path.join(demoDir, '.capture');
const baseUrl = (process.env.CHAOS_ARENA_URL || 'http://localhost:3000').replace(/\/$/, '');
const width = 1920;
const height = 1080;
const voiceover = 'Welcome to Chaos Arena, where Twitch chat becomes the game master. Dodge meteor strikes and lock-on lasers, then unleash the Sonic EMP. Place your survival prediction, survive the Wheel of Chaos, and fight back for the MVP spotlight. Connect your Twitch channel or let Auto-Pilot bring the arena to life.';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function requirePlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    console.error('Playwright is required. Install it with: npm install --no-save playwright && npx playwright install chromium');
    throw error;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' exited with status ' + result.status);
}

function quotePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

function makeVoiceover(outputFile) {
  if (process.platform === 'win32') {
    const command = "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.SetOutputToWaveFile('" +
      quotePowerShell(outputFile) + "'); $s.Speak('" + quotePowerShell(voiceover) + "'); $s.Dispose()";
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
    return outputFile;
  }
  if (process.platform === 'darwin') {
    const output = outputFile.replace(/\.wav$/i, '.aiff');
    run('say', ['-o', output, voiceover]);
    return output;
  }
  const espeak = spawnSync('espeak', ['-w', outputFile, voiceover], { stdio: 'inherit' });
  if (espeak.error || espeak.status !== 0) {
    throw new Error('Install espeak (Linux) or provide a local TTS command to generate the narration audio.');
  }
  return outputFile;
}

async function postChat(page, username, message) {
  const result = await page.evaluate(async payload => {
    const response = await fetch('/api/mock/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { ok: response.ok, status: response.status, body: await response.text() };
  }, { username, message });
  if (!result.ok) throw new Error('Mock chat request failed (' + result.status + '): ' + result.body);
}

async function sendSocketAction(page, action, fields = {}) {
  return page.evaluate(({ action, fields }) => new Promise((resolve, reject) => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(protocol + '//' + location.host + '/ws');
    const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket action timed out: ' + action)); }, 5000);
    socket.onopen = () => socket.send(JSON.stringify({ action, ...fields }));
    socket.onmessage = event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'snapshot') return;
      clearTimeout(timer);
      socket.close();
      resolve(data.type);
    };
    socket.onerror = () => { clearTimeout(timer); reject(new Error('WebSocket action failed: ' + action)); };
  }), { action, fields });
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(demoDir, { recursive: true });
  fs.rmSync(captureDir, { recursive: true, force: true });
  fs.mkdirSync(captureDir, { recursive: true });

  const { chromium } = requirePlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 1,
    recordVideo: { dir: captureDir, size: { width, height } }
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const response = await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!response || response.status() >= 400) throw new Error('Studio failed to load at ' + baseUrl + '/');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(screenshotDir, '01-arena-overview.png') });

    await postChat(page, 'MediaBot', '!meteor');
    await sleep(700);
    await postChat(page, 'MediaBot', '!laser');
    await sleep(1800);
    await page.screenshot({ path: path.join(screenshotDir, '02-meteor-laser-attack.png') });

    await postChat(page, 'MediaBot', '!sonic');
    await sleep(1200);
    await page.screenshot({ path: path.join(screenshotDir, '03-sonic-emp-blast.png') });

    await postChat(page, 'MediaBot', '!wheel');
    await sleep(2600);
    await page.screenshot({ path: path.join(screenshotDir, '04-wheel-of-chaos.png') });

    await sendSocketAction(page, 'streamer_hit', { damage: 10000, attacker: 'MediaBot', weaponType: '!meteor' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '05-mvp-killcam-card.png') });

    await page.goto(baseUrl + '/overlay', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(screenshotDir, '06-obs-overlay.png') });
    await page.waitForTimeout(7000);
  } finally {
    await context.close();
    await browser.close();
  }

  if (pageErrors.length) {
    console.warn('Browser page errors observed during capture:');
    for (const error of pageErrors) console.warn(' - ' + error);
  }

  const recordings = fs.readdirSync(captureDir).filter(name => name.endsWith('.webm'));
  if (!recordings.length) throw new Error('Playwright did not produce a browser recording.');
  const webmFile = path.join(captureDir, recordings[0]);
  const narrationFile = path.join(demoDir, 'chaos-arena-voiceover.wav');
  const audioFile = makeVoiceover(narrationFile);
  const mp4File = path.join(demoDir, 'chaos-arena-demo.mp4');
  run('ffmpeg', [
    '-y', '-i', webmFile, '-i', audioFile,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
    '-af', 'apad',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-shortest',
    mp4File
  ]);
  console.log('Media generated:');
  console.log(' - Six screenshots: ' + screenshotDir);
  console.log(' - Narrated demo: ' + mp4File);
  if (pageErrors.length) process.exitCode = 2;
}

main().catch(error => {
  console.error('[Media generation failed]', error.message);
  process.exitCode = 1;
});

