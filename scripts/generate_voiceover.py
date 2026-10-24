import asyncio
import os
import edge_tts

script_text = (
    "Welcome to CHAOS ARENA: Live Twitch Chat versus Streamer AI Game Master and Sabotage Engine! "
    "Developed under Codex Session ID 01a16c20-ecd5-7850-a7a9-31ac1a72db68, this broadcast engine transforms "
    "passive stream viewers into active raid combatants waging real-time war against a live, controllable streamer. "
    "On screen, the streamer pilots a high-speed cyber-ship rendered at a silky sixty frames per second, featuring "
    "smooth mouse dodging, invulnerable dash maneuvers, and dynamic shield mitigation. "
    "Meanwhile, live Twitch chat spawns real physics hazards directly targeting the streamer's ship: homing meteors, "
    "one-point-five second sniper laser beams, black hole gravity vortices, and control inversion glitches. "
    "When overwhelmed, the streamer triggers the revolutionary Microphone Sonic EMP Ultimate! "
    "Using real-time Web Audio digital signal processing and speech recognition, the streamer shouts into their mic to "
    "detonate an expanding shockwave that vaporizes every enemy projectile on screen! "
    "The arena features a high-stakes Live Crowd Prediction engine where viewers bet Channel Sparks on survive versus rip, "
    "while an autonomous AI Game Director continuously mutates arena physics between Hyperdrive Overclock and Neon Blackout. "
    "With a one-click Twitch channel bridge and holographic 3D MVP Kill-Cam trading cards, CHAOS ARENA redefines interactive live entertainment!"
)

output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "demo", "voiceover.mp3"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)

async def generate():
    print(f"Generating voiceover to {output_path}...")
    communicate = edge_tts.Communicate(script_text, voice="en-US-ChristopherNeural", rate="+6%")
    await communicate.save(output_path)
    print("Voiceover generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate())
