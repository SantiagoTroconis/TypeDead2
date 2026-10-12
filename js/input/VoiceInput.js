// Continuous microphone listening through the browser's Web Speech API.
// Emits every (interim and final) transcript so the game can react while the
// player is still speaking, and transparently restarts when the browser ends
// the session (Chrome stops after a few seconds of silence).
//
// Alongside recognition it runs a local volume meter on the same microphone:
// transcripts take ~0.5-1s to arrive, the meter reacts instantly, so the
// player always sees that they are being heard.
class VoiceInput {
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * onSpeech({ id, alternatives: string[], isFinal }) — id is stable while a
   *   phrase is being refined, so callers can tell updates from new phrases.
   * onStatus(status) — 'listening' | 'idle' | 'denied' | 'unsupported' | 'error'
   */
  constructor({ lang = 'en-US', onSpeech, onStatus } = {}) {
    this.lang = lang;
    this.onSpeech = onSpeech || (() => {});
    this.onStatus = onStatus || (() => {});
    this.active = false;
    this.session = 0;
    this.recognition = null;
    this.status = 'idle';
    this.audioCtx = null;
    this.analyser = null;
    this.meterBuf = null;
  }

  _setStatus(status) {
    this.status = status;
    this.onStatus(status);
  }

  // Must be called from a user gesture (click) so the audio meter may start.
  start() {
    if (!VoiceInput.isSupported()) { this._setStatus('unsupported'); return; }
    if (this.active) return;
    this.active = true;
    try { this.audioCtx = this.audioCtx || new AudioContext(); this.audioCtx.resume(); } catch (e) {}
    // Ask for the microphone once up front; recognition then reuses the grant.
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => { this._startMeter(stream); if (this.active) this._open(); })
      .catch((err) => {
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
          this.active = false;
          this._setStatus('denied');
        } else {
          this._open(); // no meter (e.g. no getUserMedia), recognition may still work
        }
      });
  }

  stop() {
    this.active = false;
    if (this.recognition) this.recognition.abort();
  }

  /** Current microphone loudness, 0 (silence) to 1 (loud speech). */
  get level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.meterBuf);
    let sum = 0;
    for (let i = 0; i < this.meterBuf.length; i++) sum += this.meterBuf[i] * this.meterBuf[i];
    const db = 20 * Math.log10(Math.sqrt(sum / this.meterBuf.length) + 1e-6);
    return Math.max(0, Math.min(1, (db + 55) / 40)); // -55 dB -> 0, -15 dB -> 1
  }

  _startMeter(stream) {
    if (!this.audioCtx) return;
    try {
      const src = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.meterBuf = new Float32Array(this.analyser.fftSize);
      src.connect(this.analyser);
    } catch (e) {
      console.warn('[VoiceInput] level meter unavailable', e);
    }
  }

  _open() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.lang = this.lang;
    rec.continuous = true;      // single-shot sessions were measured to drop short words
    rec.interimResults = true;
    rec.maxAlternatives = 5;    // the right word is often the 2nd-4th guess
    const session = ++this.session;
    const openedAt = performance.now();

    rec.onstart = () => this._setStatus('listening');
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const alternatives = [];
        for (let a = 0; a < result.length; a++) alternatives.push(result[a].transcript);
        this.onSpeech({ id: `${session}:${i}`, alternatives, isFinal: result.isFinal });
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.active = false;
        this._setStatus('denied');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[VoiceInput]', e.error);
        this._setStatus('error');
      }
    };
    rec.onend = () => {
      if (this.recognition !== rec) return;
      if (this.active) {
        // Restart at once so no words are lost; back off only if sessions keep dying instantly.
        const delay = performance.now() - openedAt < 1000 ? 300 : 0;
        setTimeout(() => { if (this.active && this.recognition === rec) this._open(); }, delay);
      } else if (this.status !== 'denied') {
        this._setStatus('idle');
      }
    };

    this.recognition = rec;
    try { rec.start(); }
    catch (err) { console.warn('[VoiceInput] start failed', err); this._setStatus('error'); }
  }
}
