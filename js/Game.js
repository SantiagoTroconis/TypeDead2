// Core loop: stage/wave flow, spawning, combat and voice-driven shooting.
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.bursts = [];          // pending letter-by-letter volleys from spoken words
    this.phrases = new Map();  // recognizer phrase id -> tokens already used for shots
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
    this.hud = new Hud();
    this.scenery = new Scenery();
    this.setup();
    this.setupVoice();
    this.setupUI();
    this.start();
  }

  setup() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.buildLevel();
    this.scenery.initBats();
  }

  resize() {
    const dpr = Viewport.pixelRatio;
    const cssW = Math.max(640, this.canvas.clientWidth || Viewport.width);
    const cssH = Math.max(360, this.canvas.clientHeight || Viewport.height);
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
    this.scenery.resize(cssW, cssH);
    // Player anchored right-center
    if (this.player) {
      this.player.x = this.w - 100;
      this.player.y = this.h * 0.78;
    }
  }

  buildLevel() {
    this.entities = [];
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.bursts = [];
    this.applySettings();
    this.player = new Player(this.w - 100, this.h * 0.78);
    this.player.hp = this.player.maxHp = this.startingHp;
    this.entities.push(this.player);
  }

  applySettings() {
    const s = GameSettings;
    this.startingStage = s.startingStage;
    this.startingHp = s.startingHp;
    this.baseZombieSpeed = s.baseZombieSpeed;
    this.speedPerStage = s.speedPerStage;
    this.speedPerWave = s.speedPerWave;
    this.playerDamagePerSecond = s.playerDamagePerSecond;
    this.comboWindow = s.comboWindow;
  }

  // ---- Voice input ---------------------------------------------------------

  setupVoice() {
    this.voice = new VoiceInput({
      lang: GameSettings.voice.lang,
      onSpeech: (speech) => this.handleSpeech(speech),
      onStatus: (status) => this.handleMicStatus(status)
    });
    if (!VoiceInput.isSupported()) {
      this.hud.setMicStatus('unsupported');
      this.hud.showVoiceWarning('This browser has no speech recognition. Play in Google Chrome.');
      this.hud.el.startBtn.disabled = true;
    } else {
      this.hud.setMicStatus('idle');
      // Edge's recognizer tends to hold a word back until the next one is spoken.
      if (/Edg\//.test(navigator.userAgent)) {
        this.hud.showVoiceWarning('Tip: voice works best in Google Chrome. Edge may show your words late.', true);
      }
    }
  }

  handleMicStatus(status) {
    this.hud.setMicStatus(status);
    // Without a microphone the run can't be played: go back to the start screen.
    if (status === 'denied' && this.state !== 'menu') {
      this.state = 'menu';
      this.hud.showOverlay('startScreen');
    }
  }

  handleSpeech({ id, alternatives, isFinal }) {
    const tokens = WordMatcher.tokenize(alternatives[0]);
    if (this.state !== 'playing') {
      this.hud.showPhrase(tokens, new Set(), isFinal ? 'final' : 'interim');
      if (isFinal) this.handleMenuCommand(alternatives.join(' '));
      return;
    }
    // Interim results refine the same phrase; only tokens past `consumed` can still
    // fire. If the recognizer rewrote words it had already given us ("happily" ->
    // "water"), the rewritten part is new speech and may fire again.
    let phrase = this.phrases.get(id);
    if (!phrase) this.phrases.set(id, phrase = { consumed: 0, consumedWords: [], hits: 0, hitTokens: new Set() });
    let same = 0;
    while (same < phrase.consumed && tokens[same] === phrase.consumedWords[same]) same++;
    if (same < phrase.consumed) {
      phrase.consumed = same;
      for (const i of [...phrase.hitTokens]) if (i >= same) phrase.hitTokens.delete(i);
    }
    phrase.hits += this.shootSpokenWords(tokens, phrase, isFinal);
    // Chrome sometimes leaves a word as "interim" until the next word is spoken.
    // If the guess stops changing, judge it as final instead of waiting.
    clearTimeout(phrase.settleTimer);
    if (!isFinal) {
      phrase.settleTimer = setTimeout(() => this.settlePhrase(id, tokens), GameSettings.voice.settleDelay * 1000);
    }

    let shown = tokens, shownHits = phrase.hitTokens, state = isFinal ? 'final' : 'interim';
    if (isFinal) {
      this.phrases.delete(id);
      if (phrase.hits === 0 && GameSettings.voice.lenientPronunciation) {
        // Nothing matched the best guess — give the recognizer's other guesses a chance.
        for (const alt of alternatives.slice(1)) {
          const altTokens = WordMatcher.tokenize(alt);
          const altPhrase = { consumed: 0, consumedWords: [], hitTokens: new Set() };
          if (this.shootSpokenWords(altTokens, altPhrase, true, true) > 0) {
            shown = altTokens;
            shownHits = altPhrase.hitTokens;
            phrase.hits = 1;
            break;
          }
        }
      }
      if (phrase.hits === 0 && tokens.length) {
        this.flashMiss();
        state = 'miss';
      }
    }
    this.hud.showPhrase(shown, shownHits, state);
  }

  settlePhrase(id, tokens) {
    const phrase = this.phrases.get(id);
    if (!phrase || this.state !== 'playing') return;
    const hits = this.shootSpokenWords(tokens, phrase, true);
    if (hits) {
      phrase.hits += hits;
      this.hud.showPhrase(tokens, phrase.hitTokens, 'interim');
    }
  }

  // Fires at every zombie whose pending word appears in tokens; returns the hit count.
  shootSpokenWords(tokens, phrase, isFinal, isBackup = false) {
    let hits = 0;
    while (phrase.consumed < tokens.length) {
      const candidates = this.voiceCandidates();
      if (!candidates.length) break;
      const match = WordMatcher.findBest(tokens, phrase.consumed, candidates,
        { isFinal, isBackup, lenient: GameSettings.voice.lenientPronunciation });
      if (!match) break;
      for (let i = match.start; i < match.end; i++) phrase.hitTokens.add(i);
      phrase.consumed = match.end;
      phrase.consumedWords = tokens.slice(0, match.end);
      for (let n = 0; n < match.candidate.segments; n++) this.shootSegment(match.candidate.zombie);
      hits++;
    }
    return hits;
  }

  // What can be said right now: each zombie's next word, plus (for bosses) the
  // next words run together, since recognizers often merge "milk shake" into
  // "milkshake". Closest first, so ties favour the most dangerous zombie.
  voiceCandidates() {
    const candidates = [];
    const alive = this.zombies
      .filter(z => !z.dead && z.pendingSegment)
      .sort((a, b) => this.distanceToPlayer(a) - this.distanceToPlayer(b));
    for (const z of alive) {
      let target = '';
      for (let k = z.segIndex; k < z.segments.length; k++) {
        target += WordMatcher.compact(z.segments[k]);
        candidates.push({ zombie: z, target, segments: k - z.segIndex + 1 });
      }
    }
    return candidates;
  }

  // Voice shortcuts for the overlay buttons ("begin", "retry", ...).
  handleMenuCommand(text) {
    const words = WordMatcher.tokenize(text);
    const said = (...options) => words.some(w => options.includes(w));
    if (this.state === 'stageIntro' && said('begin', 'start', 'go', 'fight')) this.beginWaves();
    else if ((this.state === 'gameover' || this.state === 'won') && said('retry', 'again', 'restart', 'play')) this.restart();
  }

  distanceToPlayer(z) {
    return Math.hypot(this.player.x - z.x, this.player.y - z.y);
  }

  // A spoken word turns into a rapid volley: one bullet per letter.
  shootSegment(z) {
    const letters = z.speakSegment();
    z.targeted = true;
    this.bursts.push({ zombie: z, letters, timer: 0 });
    this.comboTimer = this.comboWindow;
  }

  updateBursts(dt) {
    const interval = GameSettings.voice.letterInterval;
    for (const burst of this.bursts) {
      const z = burst.zombie;
      burst.timer -= dt;
      while (burst.timer <= 0 && burst.letters > 0 && !z.dead) {
        this.fireBullet(z);
        z.revealLetter();
        burst.letters--;
        burst.timer += interval;
      }
      if (burst.letters > 0 && !z.dead) continue;
      burst.done = true;
      if (z.doomed && !z.dead && z.fullyTyped) this.killZombie(z);
      else if (!this.bursts.some(b => b !== burst && !b.done && b.zombie === z)) z.targeted = false;
    }
    this.bursts = this.bursts.filter(b => !b.done);
  }

  // ---- Combat --------------------------------------------------------------

  flashMiss() {
    this.combo = 1;
    this.comboTimer = 0;
    this.hud.setCombo(this.combo);
    this.flashTimer = 0.15;
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
    this.comboTimer = this.comboWindow;
    this.hud.setScore(this.score);
    this.hud.setCombo(this.combo);
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
  }

  shake(mag, dur) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }

  // ---- Flow: stages, waves, spawning ----------------------------------------

  setupUI() {
    const el = this.hud.el;
    el.startBtn.addEventListener('click', () => {
      this.voice.start(); // first click also asks for microphone permission
      this.beginStage(this.startingStage);
    });
    el.stageBtn.addEventListener('click', () => this.beginWaves());
    el.retryBtn.addEventListener('click', () => this.restart());
    el.winBtn.addEventListener('click', () => this.restart());
  }

  beginStage(stage) {
    this.stage = stage;
    this.wave = 0;
    this.bossSpawned = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.phrases.clear();
    this.buildLevel();
    this.hud.setStage(stage, Stages.get(stage));
    this.hud.showOverlay('stageScreen');
    this.state = 'stageIntro';
    this.updateHUD();
  }

  beginWaves() {
    this.hud.hideOverlays();
    this.state = 'playing';
    this.wave = 1;
    this.startWave();
  }

  startWave() {
    const info = Stages.get(this.stage);
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
    this.hud.setWave(isBossWave ? `WAVE ${this.wave} — BOSS` : `WAVE ${this.wave}`);
  }

  activeWords() {
    const words = [];
    for (const z of this.zombies) if (!z.dead) words.push(...z.segments.slice(z.segIndex));
    return words;
  }

  spawnZombie() {
    const segments = WordBank.pick(this.stage, this.activeWords(), false);
    const y = this.h * (0.55 + Math.random() * 0.3);
    const x = -40 - Math.random() * 120;
    const speed = this.baseZombieSpeed + (this.stage - 1) * this.speedPerStage + Math.random() * 10 + this.wave * this.speedPerWave;
    const z = new Zombie(x, y, segments, speed, this.stage);
    this.zombies.push(z);
    this.entities.push(z);
  }

  spawnBoss() {
    const segments = WordBank.pick(this.stage, this.activeWords(), true);
    const y = this.h * 0.72;
    const x = -140;
    const speed = Math.max(14, this.baseZombieSpeed * 0.7 + (this.stage - 1) * this.speedPerStage * 0.6);
    const b = new Boss(x, y, segments, speed, this.stage);
    this.zombies.push(b);
    this.entities.push(b);
    this.bossSpawned = true;
    this.shake(8, 0.4);
  }

  updateHUD() {
    this.hud.setScore(this.score);
    this.hud.setCombo(this.combo);
    this.hud.setHp(this.player.hp, this.player.maxHp);
    this.hud.setStage(this.stage, Stages.get(this.stage));
    this.hud.setWave(this.state === 'playing' ? `WAVE ${this.wave}` : '');
  }

  restart() {
    this.score = 0;
    this.combo = 1;
    this.applySettings();
    this.stage = this.startingStage;
    this.wave = 0;
    this.beginStage(this.stage);
  }

  gameOver() {
    this.state = 'gameover';
    this.hud.setEndScore(this.score);
    this.hud.showOverlay('gameOverScreen');
  }

  winGame() {
    this.state = 'won';
    this.hud.setWinScore(this.score);
    this.hud.showOverlay('winScreen');
  }

  nextStageOrWin() {
    if (this.stage >= Stages.count) this.winGame();
    else this.beginStage(this.stage + 1);
  }

  // ---- Main loop -------------------------------------------------------------

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
    this.scenery.update(dt);
    this.hud.updateMic(this.voice.level, dt);
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }

    // Always update player visuals/particles for life
    for (const e of this.entities) e.update(dt, this.player);

    if (this.state === 'playing') {
      this.updateBursts(dt);
      this.updateWaves(dt);
      if (this.state !== 'playing') return;

      // Zombie collisions with player
      for (const z of this.zombies) {
        if (z.dead || z.doomed) continue;
        const dx = z.x - this.player.x;
        const dy = z.y - this.player.y;
        if (Math.abs(dx) < 46 && Math.abs(dy) < 60) {
          this.player.takeDamage(this.playerDamagePerSecond * dt);
          this.shake(3, 0.1);
          this.hud.setHp(this.player.hp, this.player.maxHp);
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
          this.hud.setCombo(this.combo);
        }
      }
    }

    // Cleanup dead entities
    this.entities = this.entities.filter(e => !e.dead);
    this.zombies = this.zombies.filter(z => !z.dead);
    this.bullets = this.bullets.filter(b => !b.dead);
    this.particles = this.particles.filter(p => !p.dead);
  }

  updateWaves(dt) {
    const info = Stages.get(this.stage);
    const isBossWave = this.wave >= info.waves;
    if (this.waveActive) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.waveZombiesSpawned < this.waveZombiesToSpawn) {
        this.spawnZombie();
        this.waveZombiesSpawned++;
        const base = 1.6 - this.stage * 0.12 - this.wave * 0.08;
        this.spawnTimer = Math.max(0.35, base) + Math.random() * 0.5;
      }
      if (isBossWave && !this.bossSpawned && this.waveZombiesSpawned >= Math.min(2, this.waveZombiesToSpawn)) {
        this.spawnBoss();
      }
      // Wave complete when all spawned & all dead
      const allSpawned = this.waveZombiesSpawned >= this.waveZombiesToSpawn && (!isBossWave || this.bossSpawned);
      if (allSpawned && !this.zombies.some(z => !z.dead)) {
        this.waveActive = false;
        this.betweenWaveTimer = 1.6;
      }
      return;
    }
    this.betweenWaveTimer -= dt;
    if (this.betweenWaveTimer > 0) return;
    if (isBossWave) {
      // Stage cleared
      this.state = 'between';
      setTimeout(() => this.nextStageOrWin(), 400);
    } else {
      this.wave++;
      this.startWave();
    }
  }

  // ---- Rendering --------------------------------------------------------------

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
    this.scenery.draw(ctx, w, h, this.stage);

    // Entities sorted by y for pseudo-depth; player drawn separately on top
    const drawables = this.entities.slice().sort((a, b) => (a.y || 0) - (b.y || 0));
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
}
