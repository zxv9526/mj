// Comprehensive Mahjong Voice & Sound Effects Engine

class MahjongAudioManager {
  private ctx: AudioContext | null = null;
  public soundEnabled = true;
  public voiceEnabled = true;
  public volume = 0.8; // 0.0 - 1.0

  constructor() {
    // Lazy audio context init on user gesture
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Tactile tile clack when discarded on wood/acrylic table
  public playDiscardClack() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High click impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);

      // Low wooden table body thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(180, now);
      thud.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      thudGain.gain.setValueAtTime(0.4 * this.volume, now);
      thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.1);
    } catch {
      // Ignore audio error
    }
  }

  // 2. Light draw tile slide sound
  public playDrawSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  // 3. Shuffling tiles sound (tumbling sound)
  public playShuffleSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + i * 0.04;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 + Math.random() * 400, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);

        gain.gain.setValueAtTime(0.15 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      }
    } catch {}
  }

  // 4. Action alert for Chi / Peng / Gang
  public playActionAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {}
  }

  // 5. Triumphant Hu Fanfare
  public playHuFanfare() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Majestic chord: C5 -> E5 -> G5 -> C6
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.3 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    } catch {}
  }

  // 6. Natural Chinese Voice Announcement (SpeechSynthesis API)
  public speak(text: string, rate = 1.1, pitch = 1.0) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Cancel lingering speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = Math.min(1.0, this.volume * 1.2);

      // Prefer a natural Chinese voice if available
      const voices = window.speechSynthesis.getVoices();
      const cnVoice = voices.find(
        v => v.lang === 'zh-CN' || v.lang.includes('zh') || v.name.includes('Chinese')
      );
      if (cnVoice) {
        utter.voice = cnVoice;
      }

      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors
    }
  }

  // Speak tile name (e.g., "一万", "八饼", "红中")
  public speakTile(tileName: string) {
    this.speak(tileName, 1.2, 1.05);
  }

  // Speak Mahjong game actions
  public speakAction(action: 'chi' | 'peng' | 'gang' | 'hu' | 'zimo') {
    this.playActionAlert();
    switch (action) {
      case 'chi':
        this.speak('吃！', 1.2, 1.1);
        break;
      case 'peng':
        this.speak('碰！', 1.3, 1.2);
        break;
      case 'gang':
        this.speak('杠！', 1.2, 1.15);
        break;
      case 'hu':
        this.playHuFanfare();
        this.speak('胡啦！', 1.1, 1.25);
        break;
      case 'zimo':
        this.playHuFanfare();
        this.speak('自摸！大胡！', 1.1, 1.3);
        break;
    }
  }
}

export const mahjongAudio = new MahjongAudioManager();
