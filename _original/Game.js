class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.target = null; // currently-targeted zombie
    this.state = 'menu';
    this.lastTime = 0;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.stage = 1;
    this.wave = 0;
    this.spawnTimer = 0;
    this.waveZombiesToSpawn = 0;
    this.waveZombiesSpawned = 0;
    this.waveActive = false;
    this.betweenWaveTimer = 0;
    this.bossSpawned = false;
    this.flashTimer = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.time = 0;
    this.cloudTime = 0;
    this.bats = [];
    this.setup();
    this.setupInput();
    this.setupUI();
    this.start();
  }

  setup() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.buildLevel();
    this.initBats();
    if (window.Worlds && Worlds.onChange) {
      Worlds.onChange((detail) => {
        if (detail && detail.settingsOnly) this.applySettings();
        else this.applySettings();
      });
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(640, rect.width || window.innerWidth);
    const cssH = Math.max(360, rect.height || window.innerHeight);
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
    // Player anchored right-center
    if (this.player) {
      this.player.x = this.w - 100;
      this.player.y = this.h * 0.78;
    }
  }

  initBats() {
    this.bats = [];
    for (let i = 0; i < 5; i++) {
      this.bats.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.4 + 20,
        vx: 40 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  buildLevel() {
    this.entities = [];
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.target = null;
    this.applySettings();
    this.player = new Player(this.w - 100, this.h * 0.78);
    if (this.startingHp) { this.player.hp = this.startingHp; this.player.maxHp = this.startingHp; }
    this.entities.push(this.player);
  }

  applySettings() {
    const startId = (window.Worlds && Worlds.list) ? (Worlds.list()[0] || 'default') : 'default';
    const w = (window.Worlds && Worlds.get) ? Worlds.get(startId) : null;
    const s = (w && w.data && w.data.settings) || {};
    this.startingStage = s.startingStage ?? 1;
    this.startingHp = s.startingHp ?? 100;
    this.baseZombieSpeed = s.baseZombieSpeed ?? 28;
    this.speedPerStage = s.speedPerStage ?? 6;
    this.speedPerWave = s.speedPerWave ?? 2;
    this.playerDamagePerSecond = s.playerDamagePerSecond ?? 20;
    // Apply live to existing player
    if (this.player) {
      const ratio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
      this.player.maxHp = this.startingHp;
      this.player.hp = Math.min(this.player.maxHp, Math.max(1, Math.round(this.startingHp * ratio)));
      this.updateHpHUD && this.updateHpHUD();
    }
  }

  setupInput() {
    this.typedBuffer = '';
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') {
        // Allow Enter to continue on game over/win
        if ((e.key === 'Enter' || e.key === ' ') && this.state === 'gameover') {
          e.preventDefault();
          this.restart();
        }
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.cycleTarget();
        this.typedBuffer = '';
        this.updateTypedBoxDisplay();
        return;
      }
      if (e.key === 'Escape') {
        this.target = null;
        for (const z of this.zombies) z.targeted = false;
        this.typedBuffer = '';
        this.updateTypedBoxDisplay();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (this.target) {
          // Can't un-type (we've shot). Just clear buffer.
          this.typedBuffer = '';
          this.updateTypedBoxDisplay();
        }
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        this.handleLetter(e.key.toLowerCase());
      }
    });
  }

  handleLetter(ch) {
    // If no target: find the closest zombie whose first letter matches
    if (!this.target) {
      let best = null, bestD = Infinity;
      for (const z of this.zombies) {
        if (z.dead) continue;
        if (z.firstUntyped().toLowerCase() === ch) {
          const d = Math.hypot(this.player.x - z.x, this.player.y - z.y);
          if (d < bestD) { bestD = d; best = z; }
        }
      }
      if (best) {
        this.target = best;
        best.targeted = true;
        this.typedBuffer = ch;
        best.typeChar(ch);
        this.fireBullet(best);
        if (best.fullyTyped) this.killZombie(best);
        this.updateTypedBoxDisplay();
      } else {
        // Miss — reset combo slightly
        this.flashMiss();
      }
      return;
    }
    // Have a target
    const tgt = this.target;
    if (tgt.dead || tgt.fullyTyped) {
      this.target = null;
      this.typedBuffer = '';
      this.updateTypedBoxDisplay();
      // Try again as a fresh letter
      this.handleLetter(ch);
      return;
    }
    if (tgt.typeChar(ch)) {
      this.typedBuffer += ch;
      this.fireBullet(tgt);
      if (tgt.fullyTyped) {
        this.killZombie(tgt);
      }
      this.updateTypedBoxDisplay();
    } else {
      // wrong letter — mini miss
      this.flashMiss();
    }
  }

  flashMiss() {
    this.combo = 1;
    this.comboTimer = 0;
    this.updateComboHUD();
    this.flashTimer = 0.15;
  }

  cycleTarget() {
    // Pick nearest alive zombie that isn't current target
    let best = null, bestD = Infinity;
    for (const z of this.zombies) {
      if (z.dead) continue;
      if (z === this.target) continue;
      const d = Math.hypot(this.player.x - z.x, this.player.y - z.y);
      if (d < bestD) { bestD = d; best = z; }
    }
    if (this.target) this.target.targeted = false;
    if (best) {
      this.target = best;
      best.targeted = true;
    } else {
      this.target = null;
    }
  }

  fireBullet(zombie) {
    this.player.shoot(zombie.x, zombie.y - zombie.height * 0.7);
    const mp = this.player.getMuzzleWorldPos();
    const b = new Bullet(mp.x, mp.y, zombie.x, zombie.y - zombie.height * 0.7, '#eaff6a');
    this.bullets.push(b);
    this.entities.push(b);
    // Small spark particles at muzzle
    for (let i = 0; i < 4; i++) {
      const p = new Particle(mp.x, mp.y, {
        vx: Math.cos(this.player.aim) * (120 + Math.random() * 80) + (Math.random() - 0.5) * 60,
        vy: Math.sin(this.player.aim) * (120 + Math.random() * 80) + (Math.random() - 0.5) * 60,
        color: '#ffd84a', life: 0.25, size: 2 + Math.random() * 2, gravity: 20
      });
      this.particles.push(p);
      this.entities.push(p);
    }
    this.shake(2, 0.08);
  }

  killZombie(z) {
    z.dead = true;
    this.score += Math.round(z.scoreValue * this.combo);
    this.combo = Math.min(99, this.combo + 1);
    this.comboTimer = 2.5;
    this.updateScoreHUD();
    this.updateComboHUD();
    // Blood splatter
    const col = z.palette.eye;
    for (let i = 0; i < 18; i++) {
      const p = new Particle(z.x, z.y - z.height * 0.5, {
        vx: (Math.random() - 0.5) * 220,
        vy: -Math.random() * 220 - 40,
        color: Math.random() < 0.6 ? '#8a1414' : col,
        life: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        gravity: 420
      });
      this.particles.push(p);
      this.entities.push(p);
    }
    this.shake(6, 0.15);
    if (this.target === z) this.target = null;
  }

  shake(mag, dur) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }

  setupUI() {
    this.ui = {
      startScreen: document.getElementById('startScreen'),
      stageScreen: document.getElementById('stageScreen'),
      gameOverScreen: document.getElementById('gameOverScreen'),
      winScreen: document.getElementById('winScreen'),
      startBtn: document.getElementById('startBtn'),
      stageBtn: document.getElementById('stageBtn'),
      retryBtn: document.getElementById('retryBtn'),
      winBtn: document.getElementById('winBtn'),
      stageHeading: document.getElementById('stageHeading'),
      stageDesc: document.getElementById('stageDesc'),
      endScore: document.getElementById('endScore'),
      winScore: document.getElementById('winScore'),
      stageVal: document.getElementById('stageVal'),
      scoreVal: document.getElementById('scoreVal'),
      comboVal: document.getElementById('comboVal'),
      hpFill: document.getElementById('hpFill'),
      stageTitle: document.getElementById('stageTitle'),
      waveInfo: document.getElementById('waveInfo'),
      typedBox: document.getElementById('typedBox'),
      typedText: document.getElementById('typedText')
    };
    this.ui.startBtn.addEventListener('click', () => this.beginStage(1));
    this.ui.stageBtn.addEventListener('click', () => this.beginWaves());
    this.ui.retryBtn.addEventListener('click', () => this.restart());
    this.ui.winBtn.addEventListener('click', () => this.restart());
  }

  stageInfo(stage) {
    const info = {
      1: { title: 'GRAVEYARD', desc: 'The dead walk among the stones.', waves: 3 },
      2: { title: 'PUMPKIN FIELD', desc: 'Lanterns flicker. Something stirs.', waves: 3 },
      3: { title: 'ABANDONED HOUSE', desc: 'Blood runs down the walls.', waves: 3 },
      4: { title: 'HAUNTED WOODS', desc: 'The moon howls back.', waves: 3 },
      5: { title: 'THE VOID', desc: 'All of them. All at once.', waves: 3 }
    };
    return info[stage] || info[5];
  }

  beginStage(stage) {
    this.stage = stage;
    this.wave = 0;
    this.bossSpawned = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.target = null;
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.buildLevel();
    const info = this.stageInfo(stage);
    this.ui.stageHeading.textContent = `STAGE ${stage}`;
    this.ui.stageDesc.textContent = info.title + ' — ' + info.desc;
    this.ui.stageTitle.textContent = info.title;
    this.showOverlay('stageScreen');
    this.state = 'stageIntro';
    this.updateHUD();
  }

  beginWaves() {
    this.hideAllOverlays();
    this.state = 'playing';
    this.wave = 1;
    this.startWave();
  }

  startWave() {
    const info = this.stageInfo(this.stage);
    this.waveActive = true;
    this.bossSpawned = false;
    const isBossWave = this.wave >= info.waves;
    if (isBossWave) {
      // Spawn a few supporting zombies plus the boss
      this.waveZombiesToSpawn = 3 + this.stage;
    } else {
      this.waveZombiesToSpawn = 4 + this.stage + this.wave * 2;
    }
    this.waveZombiesSpawned = 0;
    this.spawnTimer = 0.5;
    this.ui.waveInfo.textContent = isBossWave ? `WAVE ${this.wave} — BOSS` : `WAVE ${this.wave}`;
  }

  spawnZombie() {
    const used = new Set();
    for (const z of this.zombies) if (!z.dead) used.add(z.word[z.typed]?.toLowerCase());
    const word = WordBank_pickUnique(this.stage, used, false);
    const y = this.h * (0.55 + Math.random() * 0.3);
    const x = -40 - Math.random() * 120;
    const speed = this.baseZombieSpeed + (this.stage - 1) * this.speedPerStage + Math.random() * 10 + this.wave * this.speedPerWave;
    const z = new Zombie(x, y, word, speed, this.stage);
    this.zombies.push(z);
    this.entities.push(z);
  }

  spawnBoss() {
    const used = new Set();
    for (const z of this.zombies) if (!z.dead) used.add(z.word[z.typed]?.toLowerCase());
    const word = WordBank_pickUnique(this.stage, used, true);
    const y = this.h * 0.72;
    const x = -140;
    const speed = Math.max(14, this.baseZombieSpeed * 0.7 + (this.stage - 1) * this.speedPerStage * 0.6);
    const b = new Boss(x, y, word, speed, this.stage);
    this.zombies.push(b);
    this.entities.push(b);
    this.bossSpawned = true;
    this.shake(8, 0.4);
  }

  updateHUD() {
    this.updateScoreHUD();
    this.updateComboHUD();
    this.updateHpHUD();
    this.ui.stageVal.textContent = this.stage;
    const info = this.stageInfo(this.stage);
    this.ui.stageTitle.textContent = info.title;
    this.ui.waveInfo.textContent = this.state === 'playing' ? `WAVE ${this.wave}` : '';
  }

  updateScoreHUD() { this.ui.scoreVal.textContent = this.score.toLocaleString(); }
  updateComboHUD() { this.ui.comboVal.textContent = 'x' + this.combo; }
  updateHpHUD() {
    const pct = Math.max(0, this.player ? this.player.hp / this.player.maxHp : 1);
    this.ui.hpFill.style.width = (pct * 100) + '%';
  }

  updateTypedBoxDisplay() {
    this.ui.typedText.textContent = (this.typedBuffer || '').toUpperCase();
  }

  showOverlay(id) {
    this.hideAllOverlays();
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
  hideAllOverlays() {
    for (const id of ['startScreen','stageScreen','gameOverScreen','winScreen']) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
  }

  restart() {
    this.score = 0;
    this.combo = 1;
    this.applySettings();
    this.stage = this.startingStage || 1;
    this.wave = 0;
    this.updateHUD();
    this.beginStage(this.stage);
  }

  gameOver() {
    this.state = 'gameover';
    this.ui.endScore.textContent = 'Score: ' + this.score.toLocaleString();
    this.showOverlay('gameOverScreen');
  }

  winGame() {
    this.state = 'won';
    this.ui.winScore.textContent = 'Final Score: ' + this.score.toLocaleString();
    this.showOverlay('winScreen');
  }

  nextStageOrWin() {
    if (this.stage >= 5) {
      this.winGame();
    } else {
      this.beginStage(this.stage + 1);
    }
  }

  start() {
    const frame = (t) => {
      const dt = Math.min((t - this.lastTime) / 1000 || 0, 0.05);
      this.lastTime = t;
      this.time += dt;
      this.update(dt);
      this.draw();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    this.cloudTime += dt;
    // Bats always animate
    for (const b of this.bats) {
      b.x += b.vx * dt;
      b.phase += dt * 6;
      if (b.x > this.w + 40) { b.x = -40; b.y = Math.random() * this.h * 0.4 + 20; }
    }
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }

    // Always update player visuals/particles for life
    for (const e of this.entities) e.update(dt, this.player);

    if (this.state === 'playing') {
      // Spawn logic
      if (this.waveActive) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.waveZombiesSpawned < this.waveZombiesToSpawn) {
          this.spawnZombie();
          this.waveZombiesSpawned++;
          const info = this.stageInfo(this.stage);
          const base = 1.6 - this.stage * 0.12 - this.wave * 0.08;
          this.spawnTimer = Math.max(0.35, base) + Math.random() * 0.5;
        }
        const info = this.stageInfo(this.stage);
        const isBossWave = this.wave >= info.waves;
        if (isBossWave && !this.bossSpawned && this.waveZombiesSpawned >= Math.min(2, this.waveZombiesToSpawn)) {
          this.spawnBoss();
        }
        // Wave complete when all spawned & all dead
        const allSpawned = this.waveZombiesSpawned >= this.waveZombiesToSpawn && (!isBossWave || this.bossSpawned);
        const anyAlive = this.zombies.some(z => !z.dead);
        if (allSpawned && !anyAlive) {
          this.waveActive = false;
          this.betweenWaveTimer = 1.6;
        }
      } else {
        this.betweenWaveTimer -= dt;
        if (this.betweenWaveTimer <= 0) {
          const info = this.stageInfo(this.stage);
          if (this.wave >= info.waves) {
            // Stage cleared
            this.state = 'between';
            setTimeout(() => this.nextStageOrWin(), 400);
            return;
          } else {
            this.wave++;
            this.startWave();
          }
        }
      }

      // Zombie collisions with player
      for (const z of this.zombies) {
        if (z.dead) continue;
        const dx = z.x - this.player.x;
        const dy = z.y - this.player.y;
        if (Math.abs(dx) < 46 && Math.abs(dy) < 60) {
          this.player.takeDamage(this.playerDamagePerSecond * dt);
          this.shake(3, 0.1);
          this.updateHpHUD();
          if (this.player.hp <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      // Combo timer
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 1;
          this.updateComboHUD();
        }
      }

      // If target died or offscreen, clear
      if (this.target && (this.target.dead || this.target.fullyTyped)) {
        this.target = null;
        this.typedBuffer = '';
        this.updateTypedBoxDisplay();
      }
    }

    // Cleanup dead entities
    this.entities = this.entities.filter(e => !e.dead);
    this.zombies = this.zombies.filter(z => !z.dead);
    this.bullets = this.bullets.filter(b => !b.dead);
    this.particles = this.particles.filter(p => !p.dead);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    // Screen shake
    let sx = 0, sy = 0;
    if (this.shakeTime > 0) {
      sx = (Math.random() - 0.5) * this.shakeMag;
      sy = (Math.random() - 0.5) * this.shakeMag;
    }
    ctx.save();
    ctx.translate(sx, sy);
    // Background
    this.drawBackground(ctx);

    // Entities sorted by y for pseudo-depth; player drawn separately on top
    const drawables = this.entities.slice().sort((a, b) => {
      const ay = a.y || 0, by = b.y || 0;
      return ay - by;
    });
    for (const e of drawables) {
      if (e === this.player) continue;
      e.draw(ctx);
    }
    // Zombie words above everyone
    for (const z of this.zombies) if (!z.dead) z.drawWord(ctx);
    // Player drawn last so gun overlays zombies that get close
    if (this.player) this.player.draw(ctx);

    // Miss flash
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashTimer * 2;
      ctx.fillStyle = '#8a1414';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Low HP vignette
    if (this.player && this.player.hp < this.player.maxHp * 0.35) {
      const pulse = 0.3 + Math.sin(this.time * 6) * 0.1;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(1, `rgba(255,0,0,${pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  drawBackground(ctx) {
    const w = this.w, h = this.h;
    const stage = this.stage;
    // Sky gradient by stage
    const skyPalettes = {
      1: ['#070a14', '#131a28', '#1a1424'],
      2: ['#0a0708', '#1f110a', '#2a140a'],
      3: ['#0a0505', '#1a0808', '#2a0a0a'],
      4: ['#040810', '#0a1420', '#101828'],
      5: ['#000', '#0a0010', '#1a0020']
    };
    const pal = skyPalettes[stage] || skyPalettes[1];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.6, pal[1]);
    g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const sx = (i * 97.13 + stage * 13.7) % w;
      const sy = (i * 53.11) % (h * 0.5);
      const tw = (Math.sin(this.time * 2 + i) + 1) * 0.5;
      ctx.globalAlpha = 0.3 + tw * 0.5;
      ctx.fillStyle = '#e8ead0';
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.restore();

    // Moon
    ctx.drawImage(lib.sprite('moon'), w * 0.12, h * 0.08, 150, 150);

    // Clouds (dark drifting)
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 4; i++) {
      const cx = ((this.cloudTime * (10 + i * 4) + i * 300) % (w + 400)) - 200;
      const cy = 40 + i * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 100 + i * 10, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Mid-ground silhouette
    this.drawStageMidground(ctx, stage);

    // Ground
    const groundY = h * 0.82;
    const gg = ctx.createLinearGradient(0, groundY, 0, h);
    const groundTop = stage === 2 ? '#1a0f08' : stage === 3 ? '#120a0a' : stage === 4 ? '#0a0f10' : stage === 5 ? '#100018' : '#0e1210';
    const groundBot = stage === 2 ? '#2a1a10' : stage === 3 ? '#200a0a' : stage === 4 ? '#121a1a' : stage === 5 ? '#1a0028' : '#1a2018';
    gg.addColorStop(0, groundTop);
    gg.addColorStop(1, groundBot);
    ctx.fillStyle = gg;
    ctx.fillRect(0, groundY, w, h - groundY);
    // Ground texture — scattered marks
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 71 + stage * 31) % w;
      const gy = groundY + ((i * 53) % (h - groundY));
      ctx.fillRect(gx, gy, 2, 1);
    }

    // Foreground props (per stage)
    this.drawStageForeground(ctx, stage, groundY);

    // Bats
    for (const b of this.bats) {
      const flap = Math.sin(b.phase) * 0.3;
      ctx.save();
      ctx.translate(b.x, b.y + flap * 10);
      ctx.drawImage(lib.sprite('bat'), -16, -10, 32, 20);
      ctx.restore();
    }

    // Fog layer near player
    ctx.save();
    const fogG = ctx.createLinearGradient(0, groundY - 40, 0, h);
    fogG.addColorStop(0, 'rgba(80,80,90,0)');
    fogG.addColorStop(1, 'rgba(80,80,100,0.35)');
    ctx.fillStyle = fogG;
    ctx.fillRect(0, groundY - 40, w, h - groundY + 40);
    ctx.restore();
  }

  drawStageMidground(ctx, stage) {
    const w = this.w, h = this.h;
    const groundY = h * 0.82;
    if (stage === 3) {
      // House prominent
      ctx.drawImage(lib.sprite('house'), w * 0.08, groundY - 300, 420, 300);
    } else {
      // Distant house silhouette
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.drawImage(lib.sprite('house'), w * 0.02, groundY - 180, 260, 190);
      ctx.restore();
    }
    // Dead trees
    const treeCount = stage === 4 ? 5 : 3;
    for (let i = 0; i < treeCount; i++) {
      const tx = w * (0.3 + i * 0.18);
      const scale = 0.9 + (i % 2) * 0.2;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(lib.sprite('deadtree'), tx - 80 * scale, groundY - 210 * scale, 160 * scale, 220 * scale);
      ctx.restore();
    }
    // Fence line
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < Math.ceil(w / 180) + 1; i++) {
      ctx.drawImage(lib.sprite('fence'), i * 180 - 20, groundY - 50, 180, 70);
    }
    ctx.restore();
  }

  drawStageForeground(ctx, stage, groundY) {
    const w = this.w, h = this.h;
    // Tombstones scattered
    const stones = [
      [0.08, 60, 80],
      [0.22, 50, 68],
      [0.5, 70, 92],
      [0.68, 54, 72],
      [0.84, 62, 82],
      [0.38, 46, 60]
    ];
    for (const [frac, sw, sh] of stones) {
      const x = w * frac;
      if (stage === 1 || stage === 5) {
        ctx.drawImage(lib.sprite('tombstone'), x - sw / 2, groundY - sh + 8, sw, sh);
      } else if (stage === 4) {
        ctx.drawImage(lib.sprite('cross'), x - sw * 0.4, groundY - sh + 8, sw * 0.8, sh * 0.9);
      }
    }
    // Pumpkins for stage 2
    if (stage === 2) {
      const pumps = [0.1, 0.28, 0.44, 0.6, 0.75, 0.9, 0.18, 0.52];
      for (let i = 0; i < pumps.length; i++) {
        const px = w * pumps[i];
        const scale = 0.8 + (i % 3) * 0.25;
        ctx.drawImage(lib.sprite('pumpkin'), px - 25 * scale, groundY - 20 * scale, 50 * scale, 42 * scale);
      }
    }
    // Stage 3 — blood splashes on ground
    if (stage === 3) {
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const bx = (i * 173 + 40) % w;
        const by = groundY + ((i * 37) % (h - groundY - 10)) + 4;
        ctx.fillStyle = '#3a0808';
        ctx.beginPath();
        ctx.ellipse(bx, by, 18 + (i % 3) * 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a0a0a';
        ctx.fillRect(bx - 2, by - 1, 3, 2);
      }
      ctx.restore();
    }
  }
}
