/**
 * CHAOS//ARENA: 60FPS Streamer vs. Chat Arena, Cyber-Ship & Physics Hazard Engine
 */

class ChaosCanvasEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.mode = options.mode || 'synthwave'; // 'synthwave' | 'webcam' | 'transparent'
    this.width = this.canvas.width = 1920;
    this.height = this.canvas.height = 1080;

    // --- Controllable Streamer Cyber-Ship ---
    this.ship = {
      x: this.width * 0.5,
      y: this.height * 0.78,
      tx: this.width * 0.5,
      ty: this.height * 0.78,
      vx: 0,
      vy: 0,
      radius: 22,
      angle: -Math.PI / 2,
      isDashing: false,
      dashCooldown: 0,
      dashDuration: 0,
      dashGhostTrails: [],
      shield: 500,
      maxShield: 500,
      hp: 1000,
      maxHp: 1000,
      isAlive: true,
      reversedControls: false,
      reverseTimer: 0
    };

    // --- Cyber-Boss ---
    this.boss = {
      x: this.width * 0.5,
      y: 160,
      radius: 65,
      hp: 6000,
      maxHp: 6000,
      shield: 2000,
      maxShield: 2000,
      phase: 1,
      name: 'NEXUS-9 // OVERLORD CORE',
      isAlive: true,
      hoverOffset: 0
    };

    // --- Combat & Physics Collections ---
    this.hazards = []; // Chat targeted hazards (!meteor, !laser, !gravity, !heal)
    this.particles = [];
    this.damageNumbers = [];
    this.empShockwaves = [];
    this.blackHoles = [];
    this.sniperBeams = [];

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Active World Mutation
    this.activeMutation = { id: 'standard', name: 'STANDARD', desc: '' };

    // Wheel of Chaos
    this.wheel = {
      active: false,
      angle: 0,
      speed: 0,
      targetAngle: 0,
      deceleration: 0.985,
      landed: false,
      landedText: '',
      slices: ['1 Hand (30s)', 'Rhymes Only', 'Invert Mouse', 'Charades Only', 'Floor is Lava', 'Drop Weapon', 'Battle Anthem', 'Shields Down'],
      colors: ['#00f0ff', '#ff007f', '#00ff88', '#ffbe0b', '#8a2be2', '#38bdf8', '#f43f5e', '#a855f7']
    };

    // Keyboard & Mouse Listeners
    this.keys = {};
    this.initControls();

    // Synthwave Grid & Starfield
    this.gridOffset = 0;
    this.stars = [];
    this.initStars();

    // Resize handling
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // Start 60FPS loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleResize() {
    if (!this.canvas) return;
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.width = 1920;
    this.height = 1080;
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.65),
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.2,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        this.triggerDash();
        e.preventDefault();
      }
      if (e.code === 'KeyE') {
        this.triggerSonicEmp('KEYBOARD [E]');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;

      let mx = (e.clientX - rect.left) * scaleX;
      let my = (e.clientY - rect.top) * scaleY;

      if (this.ship.reversedControls) {
        mx = this.width - mx;
        my = this.height - my;
      }

      this.ship.tx = Math.max(30, Math.min(this.width - 30, mx));
      this.ship.ty = Math.max(260, Math.min(this.height - 40, my));
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.triggerDash();
    });
  }

  triggerDash() {
    if (!this.ship.isAlive || this.ship.dashCooldown > 0) return;
    this.ship.isDashing = true;
    this.ship.dashDuration = 0.25; // 250ms invulnerability
    this.ship.dashCooldown = 1.2;  // 1.2s cooldown

    // Ghost trails
    for (let i = 0; i < 4; i++) {
      this.ship.dashGhostTrails.push({
        x: this.ship.x + (this.ship.vx * i * 4),
        y: this.ship.y + (this.ship.vy * i * 4),
        angle: this.ship.angle,
        alpha: 0.7 - i * 0.15
      });
    }

    if (window.audioEngine) window.audioEngine.playDash();
  }

  triggerSonicEmp(source = 'STREAMER ULTIMATE') {
    // Massive 60FPS Shockwave that vaporizes all enemy hazards on screen
    this.empShockwaves.push({
      x: this.ship.x,
      y: this.ship.y,
      radius: 20,
      maxRadius: 1500,
      speed: 1800, // px per second
      alpha: 1.0
    });

    this.shake(25, 500);

    // Destroy all active hazards
    for (const h of this.hazards) {
      this.spawnSparks(h.x, h.y, 25, '#00f0ff');
      this.addDamageNumber('VAPORIZED!', h.x, h.y - 20, '#00f0ff', 1.2);
    }
    this.hazards = [];
    this.blackHoles = [];
    this.sniperBeams = [];

    if (window.audioEngine) {
      window.audioEngine.playSonicEmp();
      window.audioEngine.speak('Sonic EMP Unleashed! Screen Cleared!');
    }
  }

  setMode(newMode) {
    this.mode = newMode;
  }

  shake(intensity = 15, duration = 300) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  updateBoss(bossData) {
    if (!bossData) return;
    this.boss.hp = bossData.hp;
    this.boss.maxHp = bossData.maxHp;
    this.boss.shield = bossData.shield;
    this.boss.maxShield = bossData.maxShield;
    this.boss.phase = bossData.phase;
    this.boss.name = bossData.name;
    this.boss.isAlive = bossData.isAlive;
  }

  updateStreamer(streamerData) {
    if (!streamerData) return;
    this.ship.hp = streamerData.hp;
    this.ship.shield = streamerData.shield;
    this.ship.isAlive = streamerData.isAlive;
  }

  setMutation(mutation) {
    this.activeMutation = mutation;
    this.shake(12, 400);
  }

  // --- Chat Hazard Spawners ---

  spawnChatHazard(type, attacker, color = '#ff007f') {
    const isHyperdrive = this.activeMutation.id === 'hyperdrive';
    const speedMult = isHyperdrive ? 1.5 : 1.0;

    if (type === 'meteor') {
      // Homing fireball entering from edges tracking toward streamer ship
      const edge = Math.floor(Math.random() * 3);
      let sx = Math.random() * this.width;
      let sy = -40;
      if (edge === 1) { sx = -40; sy = Math.random() * 400 + 200; }
      if (edge === 2) { sx = this.width + 40; sy = Math.random() * 400 + 200; }

      this.hazards.push({
        type: 'meteor',
        attacker,
        color: '#ffbe0b',
        x: sx,
        y: sy,
        radius: 16,
        speed: (Math.random() * 2.5 + 4.5) * speedMult,
        life: 7.0
      });
      if (window.audioEngine) window.audioEngine.playMeteor();
    }
    else if (type === 'laser') {
      // 1.5s lock-on sniper beam telegraph
      this.sniperBeams.push({
        attacker,
        color: '#ff007f',
        tx: this.ship.x,
        ty: this.ship.y,
        timer: 1.5, // 1.5s countdown
        charged: false,
        duration: 0.35, // 350ms active beam
        beamWidth: 0
      });
      if (window.audioEngine) window.audioEngine.playSniperLock();
    }
    else if (type === 'gravity') {
      // Black hole vortex pulling the ship
      const bhX = this.width * (0.3 + Math.random() * 0.4);
      const bhY = this.height * (0.45 + Math.random() * 0.3);
      this.blackHoles.push({
        x: bhX,
        y: bhY,
        radius: 75,
        attacker,
        life: 7.0,
        pullStrength: 3.5
      });
      this.shake(15, 400);
      if (window.audioEngine) window.audioEngine.playGravityVortex();
    }
    else if (type === 'reverse') {
      // Invert streamer controls for 6s
      this.ship.reversedControls = true;
      this.ship.reverseTimer = 6.0;
      this.addDamageNumber('CONTROLS INVERTED!', this.ship.x, this.ship.y - 45, '#ff007f', 1.4);
      if (window.audioEngine) window.audioEngine.playPhaseSiren();
    }
    else if (type === 'heal') {
      // Floating green repair orb for streamer to catch
      this.hazards.push({
        type: 'heal',
        attacker,
        color: '#00ff88',
        x: Math.random() * (this.width - 200) + 100,
        y: -30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() * 1.5 + 2.0),
        radius: 14,
        life: 8.0
      });
      if (window.audioEngine) window.audioEngine.playHeal();
    }
    else if (type === 'plasma') {
      // Attack against boss
      this.hazards.push({
        type: 'plasma_boss',
        attacker,
        color: '#00f0ff',
        x: this.ship.x + (Math.random() * 40 - 20),
        y: this.ship.y - 30,
        tx: this.boss.x,
        ty: this.boss.y,
        speed: 14 * speedMult,
        radius: 8,
        life: 2.0
      });
    }
  }

  spawnSparks(x, y, count = 18, color = '#00f0ff') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  addDamageNumber(text, x, y, color = '#00f0ff', scale = 1.0) {
    this.damageNumbers.push({
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -(Math.random() * 3 + 2.5),
      color,
      scale,
      alpha: 1.0,
      life: 1.0
    });
  }

  spinWheel(targetIndex, penaltyText) {
    this.wheel.active = true;
    this.wheel.landed = false;
    this.wheel.landedText = penaltyText;

    const numSlices = this.wheel.slices.length;
    const sliceAngle = (Math.PI * 2) / numSlices;
    const targetOffset = targetIndex * sliceAngle + sliceAngle * 0.5;
    const extraSpins = (Math.PI * 2) * (5 + Math.floor(Math.random() * 3));
    this.wheel.targetAngle = extraSpins + ((Math.PI * 1.5) - targetOffset);
    this.wheel.angle = 0;
    this.wheel.speed = 0.45;

    if (window.audioEngine) window.audioEngine.playPhaseSiren();
  }

  // --- Main 60FPS Loop ---
  animate(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.ctx.save();

    // 1. Screen Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt * 1000;
      const currentIntensity = this.shakeIntensity * (this.shakeDuration / 300);
      const offsetX = (Math.random() - 0.5) * currentIntensity;
      const offsetY = (Math.random() - 0.5) * currentIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // 2. Clear / Background
    if (this.mode === 'synthwave') {
      this.renderSynthwaveBackground(dt);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    // 3. World Mutation Visual Adjustments (e.g. Neon Blackout spotlight)
    if (this.activeMutation.id === 'neon_blackout') {
      this.renderBlackoutSpotlight();
    }

    // 4. Update & Render Boss
    if (this.boss.isAlive) {
      this.renderBoss(now);
    }

    // 5. Update & Render Black Holes
    this.updateBlackHoles(dt);

    // 6. Update & Render Sniper Beams
    this.updateSniperBeams(dt);

    // 7. Update & Render Chat Hazards
    this.updateHazards(dt);

    // 8. Update & Render Sonic EMP Shockwaves
    this.updateEmpShockwaves(dt);

    // 9. Update & Render Streamer Cyber-Ship
    if (this.ship.isAlive) {
      this.updateStreamerShip(dt);
    }

    // 10. Update & Render Particles & Damage Numbers
    this.renderParticles(dt);
    this.renderDamageNumbers(dt);

    // 11. Render Wheel of Chaos if active
    if (this.wheel.active) {
      this.renderWheel(dt);
    }

    this.ctx.restore();
    requestAnimationFrame(this.animate);
  }

  // --- Streamer Cyber-Ship Physics & Render ---
  updateStreamerShip(dt) {
    const ctx = this.ctx;
    const s = this.ship;

    // Control timers
    if (s.dashCooldown > 0) s.dashCooldown -= dt;
    if (s.dashDuration > 0) {
      s.dashDuration -= dt;
      if (s.dashDuration <= 0) s.isDashing = false;
    }
    if (s.reverseTimer > 0) {
      s.reverseTimer -= dt;
      if (s.reverseTimer <= 0) s.reversedControls = false;
    }

    // Smooth movement interpolation toward target
    const ease = s.isDashing ? 0.35 : 0.16;
    s.vx = (s.tx - s.x) * ease;
    s.vy = (s.ty - s.y) * ease;
    s.x += s.vx;
    s.y += s.vy;

    // Ship facing angle (steers toward movement direction)
    const moveDist = Math.hypot(s.vx, s.vy);
    if (moveDist > 1.5) {
      s.angle = Math.atan2(s.vy, s.vx) + Math.PI / 2;
    }

    // Engine exhaust particles
    if (moveDist > 0.5) {
      const trailAngle = s.angle + Math.PI / 2;
      this.particles.push({
        x: s.x - Math.cos(trailAngle) * 20,
        y: s.y - Math.sin(trailAngle) * 20,
        vx: (Math.random() - 0.5) * 2 - Math.cos(trailAngle) * 4,
        vy: (Math.random() - 0.5) * 2 - Math.sin(trailAngle) * 4,
        radius: Math.random() * 4 + 2,
        color: s.isDashing ? '#ff007f' : '#00f0ff',
        alpha: 0.8,
        decay: 0.08
      });
    }

    ctx.save();

    // 1. Microphone Voice-Reactive Sonic Ring
    const micVol = window.audioEngine ? window.audioEngine.getMicVolume() : 0.0;
    if (micVol > 0.05) {
      const ringRadius = 38 + (micVol * 85);
      ctx.beginPath();
      ctx.arc(s.x, s.y, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2 + (micVol * 5);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + micVol * 0.6})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    // 2. Dash Ghost Trails
    for (let i = s.dashGhostTrails.length - 1; i >= 0; i--) {
      const g = s.dashGhostTrails[i];
      g.alpha -= dt * 2.5;
      if (g.alpha <= 0) {
        s.dashGhostTrails.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = '#ff007f';
      this.drawShipHull(ctx, true);
      ctx.restore();
    }

    // 3. Render Cyber-Ship Body
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    // Glowing Shield Bubble
    if (s.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, s.radius + 12, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = s.isDashing ? '#ff007f' : 'rgba(0, 240, 255, 0.7)';
      ctx.shadowColor = s.isDashing ? '#ff007f' : '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.stroke();
    }

    // Ship Hull
    this.drawShipHull(ctx, s.isDashing);

    ctx.restore();

    // 4. Streamer HUD Bar on Canvas (Directly under ship)
    ctx.save();
    const hpBarW = 70;
    const hpBarH = 5;
    const bx = s.x - (hpBarW / 2);
    const by = s.y + 35;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx, by, hpBarW, hpBarH);

    const hpRatio = Math.max(0, s.hp / s.maxHp);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(bx, by, hpBarW * hpRatio, hpBarH);

    // Shield overlay
    if (s.shield > 0) {
      const shieldRatio = Math.max(0, s.shield / s.maxShield);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(bx, by - 3, hpBarW * shieldRatio, 2);
    }

    // Streamer tag
    ctx.font = 'bold 11px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('STREAMER', s.x, by - 6);
    ctx.restore();
  }

  drawShipHull(ctx, isDashing) {
    ctx.beginPath();
    ctx.moveTo(0, -26); // Nose
    ctx.lineTo(18, 18);  // Right wing
    ctx.lineTo(0, 10);   // Center thruster indent
    ctx.lineTo(-18, 18); // Left wing
    ctx.closePath();

    ctx.fillStyle = isDashing ? '#ff007f' : '#0f172a';
    ctx.shadowColor = isDashing ? '#ff007f' : '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = isDashing ? '#ffffff' : '#00f0ff';
    ctx.stroke();

    // Cockpit neon core
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = isDashing ? '#ffffff' : '#00ff88';
    ctx.fill();
  }

  // --- Black Holes (!gravity) ---
  updateBlackHoles(dt) {
    const ctx = this.ctx;
    for (let i = this.blackHoles.length - 1; i >= 0; i--) {
      const bh = this.blackHoles[i];
      bh.life -= dt;
      if (bh.life <= 0) {
        this.blackHoles.splice(i, 1);
        continue;
      }

      // Gravitational Pull on Streamer Ship
      if (this.ship.isAlive && !this.ship.isDashing) {
        const dx = bh.x - this.ship.x;
        const dy = bh.y - this.ship.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15 && dist < 450) {
          const force = (1 - (dist / 450)) * bh.pullStrength;
          this.ship.x += (dx / dist) * force;
          this.ship.y += (dy / dist) * force;
        }
      }

      // Render Black Hole Vortex
      ctx.save();
      ctx.translate(bh.x, bh.y);
      const angle = performance.now() * 0.004;

      ctx.beginPath();
      ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#05030a';
      ctx.shadowColor = '#8a2be2';
      ctx.shadowBlur = 30;
      ctx.fill();

      // Accretion disk
      ctx.rotate(angle);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(138, 43, 226, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, bh.radius + 15, 0, Math.PI * 1.5);
      ctx.stroke();

      // Attacker Tag
      ctx.font = 'bold 12px "Orbitron", sans-serif';
      ctx.fillStyle = '#a855f7';
      ctx.textAlign = 'center';
      ctx.fillText(`[${bh.attacker}] BLACK HOLE`, 0, -bh.radius - 20);
      ctx.restore();
    }
  }

  // --- Sniper Beams (!laser) ---
  updateSniperBeams(dt) {
    const ctx = this.ctx;
    for (let i = this.sniperBeams.length - 1; i >= 0; i--) {
      const sb = this.sniperBeams[i];

      if (sb.timer > 0) {
        // Charging phase: tracks streamer ship
        sb.timer -= dt;
        sb.tx = this.ship.x;
        sb.ty = this.ship.y;

        // Draw telegraph tracking beam
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(this.boss.x, this.boss.y);
        ctx.lineTo(sb.tx, sb.ty);
        ctx.stroke();

        // Lock-on Crosshair
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ff007f';
        ctx.strokeRect(sb.tx - 18, sb.ty - 18, 36, 36);

        ctx.font = 'bold 11px "Orbitron", sans-serif';
        ctx.fillStyle = '#ff007f';
        ctx.textAlign = 'center';
        ctx.fillText(`[${sb.attacker}] SNIPER (${sb.timer.toFixed(1)}s)`, sb.tx, sb.ty - 25);
        ctx.restore();

      } else {
        // Firing Phase: Lethal Beam
        sb.duration -= dt;
        if (sb.duration <= 0) {
          this.sniperBeams.splice(i, 1);
          continue;
        }

        // Check collision with streamer
        const dist = Math.hypot(sb.tx - this.ship.x, sb.ty - this.ship.y);
        if (dist < 45 && !this.ship.isDashing) {
          this.onStreamerHit(280, sb.attacker, '!laser');
        }

        // Render thick death beam
        ctx.save();
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 22;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.moveTo(this.boss.x, this.boss.y);
        ctx.lineTo(sb.tx, sb.ty);
        ctx.stroke();

        // White core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // --- Chat Hazards Updates ---
  updateHazards(dt) {
    const ctx = this.ctx;

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.life -= dt;
      if (h.life <= 0) {
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.type === 'meteor') {
        // Homing toward streamer ship
        const dx = this.ship.x - h.x;
        const dy = this.ship.y - h.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          h.x += (dx / dist) * h.speed;
          h.y += (dy / dist) * h.speed;
        }

        // Check collision with streamer ship
        if (dist < h.radius + this.ship.radius && !this.ship.isDashing) {
          this.spawnSparks(h.x, h.y, 30, '#ffbe0b');
          this.shake(18, 300);
          this.onStreamerHit(220, h.attacker, '!meteor');
          this.hazards.splice(i, 1);
          continue;
        }

        // Render Meteor with Viewer Tag
        ctx.save();
        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fire trail
        this.particles.push({
          x: h.x,
          y: h.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: h.radius * 0.6,
          color: '#ff007f',
          alpha: 0.7,
          decay: 0.08
        });

        // Floating Attacker Tag
        ctx.font = 'bold 11px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffbe0b';
        ctx.textAlign = 'center';
        ctx.fillText(`[${h.attacker}]`, h.x, h.y - h.radius - 8);
        ctx.restore();
      }
      else if (h.type === 'heal') {
        // Floating green repair orb
        h.x += h.vx;
        h.y += h.vy;

        const dist = Math.hypot(this.ship.x - h.x, this.ship.y - h.y);
        if (dist < h.radius + this.ship.radius) {
          // Streamer caught repair orb!
          this.spawnSparks(h.x, h.y, 25, '#00ff88');
          this.addDamageNumber('+200 SHIELD!', this.ship.x, this.ship.y - 30, '#00ff88', 1.3);
          if (window.audioEngine) window.audioEngine.playHeal();
          if (window.onStreamerHeal) window.onStreamerHeal(200);
          this.hazards.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 11px "Orbitron", sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'center';
        ctx.fillText(`+REPAIR [${h.attacker}]`, h.x, h.y - h.radius - 6);
        ctx.restore();
      }
      else if (h.type === 'plasma_boss') {
        // Heading toward boss
        const dx = h.tx - h.x;
        const dy = h.ty - h.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 30) {
          this.spawnSparks(h.tx, h.ty, 18, h.color);
          this.hazards.splice(i, 1);
          continue;
        }

        h.x += (dx / dist) * h.speed;
        h.y += (dy / dist) * h.speed;

        ctx.save();
        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  onStreamerHit(damage, attacker, weaponType) {
    if (window.onStreamerHit) {
      window.onStreamerHit(damage, attacker, weaponType);
    }
    this.addDamageNumber(`-${damage}!`, this.ship.x, this.ship.y - 35, '#ff007f', 1.3);
  }

  // --- Sonic EMP Shockwave Expansion ---
  updateEmpShockwaves(dt) {
    const ctx = this.ctx;
    for (let i = this.empShockwaves.length - 1; i >= 0; i--) {
      const sw = this.empShockwaves[i];
      sw.radius += sw.speed * dt;
      sw.alpha -= dt * 1.2;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.empShockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.lineWidth = 14 * sw.alpha;
      ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 35;
      ctx.stroke();

      // Inner white edge
      ctx.lineWidth = 4 * sw.alpha;
      ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- World Mutations: Neon Blackout Spotlight ---
  renderBlackoutSpotlight() {
    const ctx = this.ctx;
    ctx.save();

    // Dark canvas overlay
    const gradient = ctx.createRadialGradient(
      this.ship.x, this.ship.y, 40,
      this.ship.x, this.ship.y, 340
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(3, 4, 10, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.96)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  // --- Synthwave Horizon ---
  renderSynthwaveBackground(dt) {
    const ctx = this.ctx;
    ctx.fillStyle = '#060815';
    ctx.fillRect(0, 0, this.width, this.height);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.75);
    skyGrad.addColorStop(0, '#040510');
    skyGrad.addColorStop(0.5, '#0b1028');
    skyGrad.addColorStop(1, '#1b0d2d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height * 0.75);

    // Stars
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.height * 0.72) star.y = 0;
      ctx.fillStyle = `rgba(0, 240, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Grid
    const horizonY = this.height * 0.68;
    this.gridOffset = (this.gridOffset + dt * 140) % 60;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;

    for (let y = horizonY; y < this.height; y += (y - horizonY) * 0.28 + 14) {
      const lineY = y + (this.gridOffset * ((y - horizonY) / (this.height - horizonY)));
      if (lineY > this.height) continue;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(this.width, lineY);
      ctx.stroke();
    }

    const fovCount = 28;
    for (let i = -fovCount; i <= fovCount; i++) {
      ctx.beginPath();
      ctx.moveTo(this.width * 0.5, horizonY);
      ctx.lineTo((this.width * 0.5) + (i * 90), this.height);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(this.width, horizonY);
    ctx.stroke();
    ctx.restore();
  }

  // --- Boss Rendering ---
  renderBoss(now) {
    const ctx = this.ctx;
    const b = this.boss;

    b.hoverOffset = Math.sin(now * 0.003) * 14;
    const cy = b.y + b.hoverOffset;
    const cx = b.x;

    let themeColor = b.phase === 3 ? '#ef4444' : b.phase === 2 ? '#ff007f' : '#00f0ff';
    let ringColor = b.phase === 3 ? 'rgba(239, 68, 68, 0.7)' : b.phase === 2 ? 'rgba(255, 0, 127, 0.5)' : 'rgba(0, 240, 255, 0.4)';

    ctx.save();
    const angle1 = now * 0.0015;

    ctx.lineWidth = 3;
    ctx.strokeStyle = ringColor;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(cx, cy, b.radius + 35, angle1, angle1 + Math.PI * 1.4);
    ctx.stroke();

    const corePulse = Math.sin(now * 0.006) * 6;
    const coreGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, b.radius + corePulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, themeColor);
    coreGrad.addColorStop(1, '#050811');

    ctx.beginPath();
    ctx.arc(cx, cy, b.radius + corePulse, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.font = 'bold 16px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.name}`, cx, cy - b.radius - 45);

    const barW = 340;
    const barH = 12;
    const bx = cx - (barW / 2);
    const by = cy - b.radius - 35;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx, by, barW, barH);

    const hpRatio = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = themeColor;
    ctx.fillRect(bx, by, barW * hpRatio, barH);

    if (b.shield > 0) {
      const shieldRatio = Math.max(0, b.shield / b.maxShield);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(bx, by + barH + 3, barW * shieldRatio, 4);
    }

    ctx.restore();
  }

  renderParticles(dt) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderDamageNumbers(dt) {
    const ctx = this.ctx;
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.x += dn.vx;
      dn.y += dn.vy;
      dn.life -= dt * 1.2;
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, dn.life);
      ctx.font = `bold ${Math.round(26 * dn.scale)}px "Orbitron", sans-serif`;
      ctx.fillStyle = dn.color;
      ctx.shadowColor = dn.color;
      ctx.shadowBlur = 15;
      ctx.textAlign = 'center';
      ctx.fillText(dn.text, dn.x, dn.y);
      ctx.restore();
    }
  }

  renderWheel(dt) {
    const ctx = this.ctx;
    const w = this.wheel;

    if (!w.landed) {
      w.angle += w.speed;
      w.speed *= w.deceleration;
      if (w.speed < 0.005) {
        w.landed = true;
        w.speed = 0;
        setTimeout(() => { w.active = false; }, 5500);
      }
    }

    ctx.save();
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;
    const radius = 220;
    const numSlices = w.slices.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.translate(cx, cy);
    ctx.rotate(w.angle);

    for (let i = 0; i < numSlices; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.fillStyle = w.colors[i % w.colors.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#050711';
      ctx.stroke();

      ctx.save();
      ctx.rotate(i * sliceAngle + sliceAngle * 0.5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Orbitron", sans-serif';
      ctx.fillText(w.slices[i], radius - 15, 5);
      ctx.restore();
    }

    ctx.restore();
  }
}

// Global Singleton Hook
window.ChaosCanvasEngine = ChaosCanvasEngine;
