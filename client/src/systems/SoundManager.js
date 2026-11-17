// Web Audio API Sound Synthesizer & BGM Manager
class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgm = null;
    this.muted = false;
    this.volume = 0.5;
    this.bgmIndex = 1;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.bgm) {
      this.bgm.muted = this.muted;
    }
    return this.muted;
  }

  playBgm(mapIndex = 1) {
    if (this.bgm) {
      this.bgm.pause();
    }
    const idx = ((mapIndex - 1) % 5) + 1;
    this.bgmIndex = idx;
    try {
      this.bgm = new Audio(`/assets/sound/mapsound${idx}.mp3`);
      this.bgm.loop = true;
      this.bgm.volume = this.volume * 0.4;
      this.bgm.muted = this.muted;
      this.bgm.play().catch(() => {});
    } catch (e) {
      console.warn("BGM play error:", e);
    }
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  playPaddleHit() {
    this.playTone(320, 0.08, 'triangle', 420);
  }

  playBrickHit(type = 1) {
    const freqs = [400, 520, 300, 650, 780, 240, 600, 700, 480];
    const f = freqs[type] || 500;
    this.playTone(f, 0.06, 'sine', f * 1.3);
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch (e) {}
  }

  playPowerup() {
    if (this.muted) return;
    this.init();
    try {
      [440, 554, 659, 880].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 0.08, 'sine'), idx * 45);
      });
    } catch (e) {}
  }

  playLaser() {
    this.playTone(880, 0.07, 'sawtooth', 220);
  }

  playLoseBall() {
    if (this.muted) return;
    this.init();
    [300, 250, 180, 120].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.1, 'sawtooth'), idx * 70);
    });
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    [523, 659, 784, 1046].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.18, 'triangle'), idx * 120);
    });
  }

  playTone(freq, duration, type = 'sine', slideTo = null) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
}

export const sounds = new SoundManager();
