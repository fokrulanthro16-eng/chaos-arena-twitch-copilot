# CHAOS//ARENA — Devpost Submission

## Elevator Pitch

CHAOS//ARENA turns a Twitch chat into the game master of a live cyberpunk arena. Viewers fire hazards, bend the rules, place virtual survival predictions, and try to knock out the streamer, while the streamer pilots a shielded ship and can wipe the screen with a voice-triggered Sonic EMP. An optional OpenAI commentary layer gives the chaos a live, reactive narrator.

## Inspiration

Live chat is already an audience, but too often it is only a scrolling column beside the gameplay. We wanted to make it a playable force in the broadcast: a crowd that can create real-time stakes, change the world, and decide whether the streamer survives the next wave. The cyberpunk arena and its game-master voice turn audience participation into a shared spectacle.

## What It Does

CHAOS//ARENA connects to Twitch chat with tmi.js and routes viewer commands into a Node.js game server. Express serves the studio and OBS overlay; WebSockets broadcast hazards, predictions, boss state, mutations, alerts, and knockouts in real time.

Viewers can launch meteor and laser attacks, create gravity wells, invert controls, send shield orbs, bet virtual Channel Sparks on survival or a knockout, and activate the Wheel of Chaos. The streamer pilots a glowing ship, dashes and dodges, and can trigger a Sonic EMP with a microphone shout, voice phrase, or keyboard fallback. An autonomous simulator keeps the arena active for local demos. Optional gpt-4o-mini commentary generates playful roasts, hype lines, and boss taunts; curated local lines keep the experience running without an API key.

## How We Built It

We built the application in Node.js with Express, tmi.js, WebSockets, HTML, Tailwind CSS, and a 60 FPS Canvas game engine. The studio and OBS overlay subscribe to the same event stream, so every chat action updates both views together.

OpenAI Codex helped us shape and implement the server-side game loop, browser interactions, Twitch command routing, optional AI commentary with a deterministic local fallback, documentation, and the media-generation workflow. Codex session ID: 01a16c20-ecd5-7850-a7a9-31ac1a72db68.

## Challenges We Ran Into

- Keeping Twitch chat, the simulator, the studio, and OBS synchronized without page reloads.
- Making hazards responsive while keeping animation smooth and the streamer’s controls playable.
- Designing a microphone-triggered ability that also works when browser speech recognition or mic permission is unavailable.
- Making AI commentary optional and failure-safe so an API outage or missing key never blocks chat commands.
- Creating a complete demo path that works locally without a live Twitch broadcast.

## Accomplishments

- Built a chat-versus-streamer loop where viewer commands have visible consequences.
- Added a voice-reactive Sonic EMP with keyboard fallback.
- Added 60-second crowd predictions using virtual Channel Sparks and knockout rewards.
- Added AI-directed world mutations and optional GPT commentary with curated fallback lines.
- Delivered an OBS-ready transparent overlay and an Auto-Pilot simulator that starts active.
- Added an automated workflow for six high-resolution screenshots and a narrated demo video.

## What's Next

- Add OAuth-backed channel identity and configurable moderation controls.
- Persist prediction history, channel economy, and leaderboards between streams.
- Expand the game director with streamer-configurable mutation rules and audience voting.
- Add native Twitch prediction and extension integrations where appropriate.
- Improve accessibility with captions, reduced-motion settings, and multilingual voice packs.
- Publish a hosted version with a one-click OBS setup flow.

## Built With

Node.js, Express, tmi.js, WebSockets, HTML5 Canvas, Tailwind CSS, Web Audio API, Web Speech API, OpenAI API, OpenAI Codex, Playwright, FFmpeg, Twitch
