import time
import os
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots"))
os.makedirs(output_dir, exist_ok=True)

def capture_all():
    print(f"Capturing screenshots to: {output_dir}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = context.new_page()

        # 1. 01-arena-overview.png
        print("Capturing 01-arena-overview.png...")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(3000)
        page.screenshot(path=os.path.join(output_dir, "01-arena-overview.png"))

        # 2. 02-meteor-laser-attack.png
        print("Capturing 02-meteor-laser-attack.png...")
        page.evaluate("""() => {
            if (window.canvasEngine) {
                window.canvasEngine.spawnChatHazard('meteor', 'Kai');
                window.canvasEngine.spawnChatHazard('meteor', 'Nova');
                window.canvasEngine.spawnChatHazard('laser', 'Vortex');
                window.canvasEngine.spawnChatHazard('gravity', 'ShadowFox');
                window.canvasEngine.spawnChatHazard('heal', 'AuraBot');
                window.canvasEngine.addDamageNumber('-450 CRIT!', 960, 680, '#ffbe0b', 1.4);
                window.canvasEngine.addDamageNumber('-280 LASER!', 900, 720, '#ff007f', 1.2);
            }
        }""")
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(output_dir, "02-meteor-laser-attack.png"))

        # 3. 03-sonic-emp-blast.png
        print("Capturing 03-sonic-emp-blast.png...")
        page.evaluate("""() => {
            if (window.canvasEngine) {
                window.canvasEngine.triggerSonicEmp('VOICE SHOUT: ULTIMATE');
                window.canvasEngine.addDamageNumber('SONIC EMP BLAST!', 960, 750, '#00f0ff', 1.5);
            }
        }""")
        page.wait_for_timeout(250)
        page.screenshot(path=os.path.join(output_dir, "03-sonic-emp-blast.png"))

        # 4. 04-wheel-of-chaos.png
        print("Capturing 04-wheel-of-chaos.png...")
        page.evaluate("""() => {
            if (window.canvasEngine) {
                window.canvasEngine.spinWheel(2, 'Invert Mouse for 30s');
            }
        }""")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(output_dir, "04-wheel-of-chaos.png"))

        # 5. 05-mvp-killcam-card.png
        print("Capturing 05-mvp-killcam-card.png...")
        page.evaluate("""() => {
            if (window.canvasEngine) {
                window.canvasEngine.wheel.active = false;
                window.canvasEngine.boss.phase = 3;
            }
            if (window.showMvpCard) {
                window.showMvpCard({
                    username: 'VORTEX',
                    role: '[VIP]',
                    title: 'STREAMER SLAYER // MVP',
                    damage: 2840,
                    winningCommand: '!laser CRITICAL STRIKE',
                    rewardXP: 1000
                });
            }
        }""")
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(output_dir, "05-mvp-killcam-card.png"))

        # 6. 06-obs-overlay.png
        print("Capturing 06-obs-overlay.png...")
        overlay_page = context.new_page()
        overlay_page.goto("http://localhost:3000/overlay", wait_until="networkidle")
        overlay_page.wait_for_timeout(2000)
        overlay_page.evaluate("""() => {
            if (window.canvasEngine) {
                window.canvasEngine.spawnChatHazard('meteor', 'Glitch99');
                window.canvasEngine.spawnChatHazard('laser', 'Nova');
                window.canvasEngine.addDamageNumber('-350 HIT!', 960, 650, '#00f0ff', 1.2);
            }
        }""")
        overlay_page.wait_for_timeout(500)
        overlay_page.screenshot(path=os.path.join(output_dir, "06-obs-overlay.png"), omit_background=True)
        overlay_page.close()

        browser.close()
        print("All 6 screenshots successfully captured!")

if __name__ == "__main__":
    capture_all()
