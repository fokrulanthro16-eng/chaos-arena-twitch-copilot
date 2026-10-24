import os
import time
import math
import subprocess
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEMO_DIR = os.path.join(BASE_DIR, "demo")
RAW_VIDEO_DIR = os.path.join(DEMO_DIR, "raw")
VOICEOVER_PATH = os.path.join(DEMO_DIR, "voiceover.mp3")
FINAL_MP4_PATH = os.path.join(DEMO_DIR, "chaos-arena-demo.mp4")
FFMPEG_BIN = r"C:\Users\WALTON\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

os.makedirs(RAW_VIDEO_DIR, exist_ok=True)

def record_gameplay():
    print("Starting Playwright 1920x1080 video recording...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--autoplay-policy=no-user-gesture-required", "--disable-features=PreloadMediaEngagementData"]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            record_video_dir=RAW_VIDEO_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        print("Navigating to http://localhost:3000/...")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Unlock Audio & enable microphone visual power
        page.evaluate("""() => {
            if (window.audioEngine) window.audioEngine.unlock();
            const micBtn = document.getElementById('micBtn');
            if (micBtn) micBtn.click();
        }""")

        start_time = time.time()
        target_duration = 89.0  # seconds matching voiceover

        print(f"Recording live gameplay simulation for {target_duration} seconds...")

        step = 0
        while (time.time() - start_time) < target_duration:
            elapsed = time.time() - start_time

            # 1. Smooth Ship Movement loops across arena
            cx = 960 + math.sin(elapsed * 1.5) * 380
            cy = 760 + math.cos(elapsed * 2.2) * 140
            page.evaluate(f"""([x, y]) => {{
                if (window.canvasEngine && window.canvasEngine.ship) {{
                    window.canvasEngine.ship.tx = x;
                    window.canvasEngine.ship.ty = y;
                }}
            }}""", [cx, cy])

            # 2. Timeline Orchestration
            # T = 12s: Spawn targeted meteors and lasers
            if 12.0 <= elapsed < 12.5 and step == 0:
                step = 1
                page.evaluate("""() => {
                    if (window.canvasEngine) {
                        window.canvasEngine.spawnChatHazard('meteor', 'Nova');
                        window.canvasEngine.spawnChatHazard('laser', 'Kai');
                    }
                }""")

            # T = 20s: Streamer Dash maneuver
            elif 20.0 <= elapsed < 20.5 and step == 1:
                step = 2
                page.evaluate("""() => {
                    if (window.canvasEngine) window.canvasEngine.triggerDash();
                }""")

            # T = 26s: Gravity vortex & repair orbs
            elif 26.0 <= elapsed < 26.5 and step == 2:
                step = 3
                page.evaluate("""() => {
                    if (window.canvasEngine) {
                        window.canvasEngine.spawnChatHazard('gravity', 'Vortex');
                        window.canvasEngine.spawnChatHazard('heal', 'AuraBot');
                        window.canvasEngine.spawnChatHazard('meteor', 'ShadowFox');
                    }
                }""")

            # T = 38s: Massive Sonic EMP Shockwave
            elif 38.0 <= elapsed < 38.5 and step == 3:
                step = 4
                page.evaluate("""() => {
                    if (window.canvasEngine) {
                        window.canvasEngine.triggerSonicEmp('MIC VOICE SHOUT: ULTIMATE!');
                    }
                }""")

            # T = 50s: Spin Wheel of Chaos
            elif 50.0 <= elapsed < 50.5 and step == 4:
                step = 5
                page.evaluate("""() => {
                    if (window.canvasEngine) {
                        window.canvasEngine.spinWheel(2, 'Invert Mouse for 30s');
                    }
                }""")

            # T = 68s: Connect to live Twitch channel demonstration
            elif 68.0 <= elapsed < 68.5 and step == 5:
                step = 6
                page.evaluate("""() => {
                    const input = document.getElementById('twitchInput');
                    if (input) input.value = 'shroud';
                    if (window.handleTwitchConnect) window.handleTwitchConnect();
                }""")

            # T = 78s: 3D Holographic MVP Kill-Cam Trading Card Popup
            elif 78.0 <= elapsed < 78.5 and step == 6:
                step = 7
                page.evaluate("""() => {
                    if (window.showMvpCard) {
                        window.showMvpCard({
                            username: 'VORTEX',
                            role: '[VIP] MVP',
                            title: 'STREAMER SLAYER // MVP',
                            damage: 3240,
                            winningCommand: '!laser CRITICAL OVERDRIVE',
                            rewardXP: 1000
                        });
                    }
                }""")

            time.sleep(0.1)

        print("Finalizing recording and closing browser...")
        # Get recorded video path before closing page
        video_path = page.video.path()
        page.close()
        browser.close()

        print(f"Raw video recorded to: {video_path}")
        return video_path

def merge_video(raw_video_path):
    print("Merging raw gameplay video with voiceover using FFmpeg...")
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", raw_video_path,
        "-i", VOICEOVER_PATH,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_MP4_PATH
    ]
    print(f"Executing: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    print(f"Successfully generated final demo video: {FINAL_MP4_PATH}")

if __name__ == "__main__":
    raw_video = record_gameplay()
    if raw_video and os.path.exists(raw_video):
        merge_video(raw_video)
        print("Done!")
    else:
        print("Error: Raw video not found.")
