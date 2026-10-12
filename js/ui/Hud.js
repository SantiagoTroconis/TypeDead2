// DOM side of the game: top HUD, the "heard" box, mic indicator and overlays.
class Hud {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      stageVal: $('stageVal'),
      scoreVal: $('scoreVal'),
      comboVal: $('comboVal'),
      hpFill: $('hpFill'),
      stageTitle: $('stageTitle'),
      waveInfo: $('waveInfo'),
      typedBox: $('typedBox'),
      heardText: $('heardText'),
      micStatus: $('micStatus'),
      micBars: [...document.querySelectorAll('#micMeter i')],
      micLabel: $('micLabel'),
      voiceWarning: $('voiceWarning'),
      stageHeading: $('stageHeading'),
      stageDesc: $('stageDesc'),
      endScore: $('endScore'),
      winScore: $('winScore'),
      startBtn: $('startBtn'),
      stageBtn: $('stageBtn'),
      retryBtn: $('retryBtn'),
      winBtn: $('winBtn')
    };
    this.overlays = ['startScreen', 'stageScreen', 'gameOverScreen', 'winScreen'];
    this.heardTimer = null;
    this.hasPhrase = false;   // a transcript is currently on display
    this.level = 0;           // smoothed mic level for the meter
    this.speakingUntil = 0;
    this.litBars = -1;
  }

  setStage(stage, info) {
    this.el.stageVal.textContent = stage;
    this.el.stageTitle.textContent = info.title;
    this.el.stageHeading.textContent = `STAGE ${stage}`;
    this.el.stageDesc.textContent = info.title + ' — ' + info.desc;
  }
  setWave(text) { this.el.waveInfo.textContent = text; }
  setScore(score) { this.el.scoreVal.textContent = score.toLocaleString(); }
  setCombo(combo) { this.el.comboVal.textContent = 'x' + combo; }
  setHp(hp, maxHp) {
    const pct = Math.max(0, maxHp > 0 ? hp / maxHp : 1);
    this.el.hpFill.style.width = (pct * 100) + '%';
  }

  /**
   * Shows what the microphone picked up, word by word. Words that fired a shot
   * are highlighted; state is 'interim' (still listening), 'final' or 'miss'.
   */
  showPhrase(tokens, hitIndexes, state) {
    const box = this.el.heardText;
    box.replaceChildren();
    tokens.forEach((t, i) => {
      if (i > 0) box.append(' ');
      const span = document.createElement('span');
      span.className = hitIndexes.has(i) ? 'w hit' : 'w';
      span.textContent = t.toUpperCase();
      box.append(span);
    });
    this.hasPhrase = tokens.length > 0;
    this.el.typedBox.classList.remove('pending');
    if (state === 'miss') {
      this.el.typedBox.classList.remove('miss');
      void this.el.typedBox.offsetWidth; // restart the animation
      this.el.typedBox.classList.add('miss');
    }
    clearTimeout(this.heardTimer);
    this.heardTimer = setTimeout(() => this.clearPhrase(), state === 'interim' ? 3000 : 1400);
  }

  clearPhrase() {
    this.el.heardText.replaceChildren();
    this.el.typedBox.classList.remove('miss');
    this.hasPhrase = false;
  }

  // Called every frame with the raw mic level (0-1). Drives the meter bars and
  // the "· · ·" placeholder shown while speech is being transcribed.
  updateMic(rawLevel, dt) {
    const k = rawLevel > this.level ? 0.6 : Math.min(1, dt * 6); // fast attack, slow release
    this.level += (rawLevel - this.level) * k;
    const lit = Math.round(this.level * this.el.micBars.length);
    if (lit !== this.litBars) {
      this.el.micBars.forEach((bar, i) => bar.classList.toggle('on', i < lit));
      this.litBars = lit;
    }
    const now = performance.now();
    if (rawLevel > 0.35) this.speakingUntil = now + 400;
    this.el.typedBox.classList.toggle('pending', now < this.speakingUntil && !this.hasPhrase);
  }

  setMicStatus(status) {
    const labels = {
      listening: 'LISTENING',
      idle: 'MIC OFF',
      denied: 'MIC BLOCKED',
      unsupported: 'NO VOICE SUPPORT',
      error: 'MIC ERROR'
    };
    this.el.micStatus.dataset.status = status;
    this.el.micLabel.textContent = labels[status] || status.toUpperCase();
    if (status === 'denied') {
      this.showVoiceWarning('Microphone access was blocked. Allow it in the address bar and press START again.');
    }
  }

  showVoiceWarning(message, isTip = false) {
    this.el.voiceWarning.textContent = message;
    this.el.voiceWarning.classList.toggle('tip', isTip);
    this.el.voiceWarning.classList.remove('hidden');
  }

  setEndScore(score) { this.el.endScore.textContent = 'Score: ' + score.toLocaleString(); }
  setWinScore(score) { this.el.winScore.textContent = 'Final Score: ' + score.toLocaleString(); }

  showOverlay(id) {
    this.hideOverlays();
    document.getElementById(id).classList.remove('hidden');
  }
  hideOverlays() {
    for (const id of this.overlays) document.getElementById(id).classList.add('hidden');
  }
}
