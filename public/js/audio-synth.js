/**
 * CHAOS//ARENA: Web Audio API Synthesizer, Live Mic Decibel Analyser & Speech AI Engine
 */

class AudioAnnouncerEngine {
  constructor() {
    this.audioCtx = null;
    this.sfxMuted = false;
    this.voiceMuted = false;
    this.isSpeaking = false;
    this.speechSynth = window.speechSynthesis || null;
    this.selectedVoice = null;

    // Live Microphone & Analyser State
    this.micStream = null;
    this.micSource = null;
    this.analyser = null;
    this.micDataArray = null;
    this.micActive = false;
    this.micVolume = 0.0;
    this.lastEmpTrigger = 0;
    this.speechRecognizer = null;

    this.initVoice();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  unlock() {
    this.getAudioContext();
  }

  initVoice() {
    if (!this.speechSynth) return;
    const loadVoices = () => {
      const voices = this.speechSynth.getVoices();
      this.selectedVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira'))) || voices[0];
    };
    loadVoices();
    if (this.speechSynth.onvoiceschanged !== undefined) {
      this.speechSynth.onvoiceschanged = loadVoices;
    }
  }

  // --- Live Microphone & Decibel Analyzer ---
  async toggleMicrophone(onEmpTriggerCallback) {
    if (this.micActive) {
      // Turn off
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.speechRecognizer) {
        try { this.speechRecognizer.stop(); } catch (e) {}
        this.speechRecognizer = null;
      }
      this.micActive = false;
      this.micVolume = 0.0;
      return false;
    }

    try {
      const ctx = this.getAudioContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.micSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.micDataArray = new Uint8Array(bufferLength);
      this.micActive = true;

      // Start volume sampling loop
      const sampleVolume = () => {
        if (!this.micActive || !this.analyser) return;
        this.analyser.getByteFrequencyData(this.micDataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += this.micDataArray[i];
        }
        const avg = sum / bufferLength;
        this.micVolume = Math.min(1.0, avg / 110);

        // Sonic EMP Trigger via Voice Shout (Volume > 0.68)
        const now = Date.now();
        if (this.micVolume > 0.68 && now - this.lastEmpTrigger > 6000) {
          this.lastEmpTrigger = now;
          if (onEmpTriggerCallback) onEmpTriggerCallback('VOICE SHOUT');
        }

        requestAnimationFrame(sampleVolume);
      };
      sampleVolume();

      // Init Web Speech Recognition for Keyword triggers ("ULTIMATE", "SHIELD", "CLEAR")
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechRecognizer = new SpeechRecognition();
        this.speechRecognizer.continuous = true;
        this.speechRecognizer.interimResults = false;
        this.speechRecognizer.lang = 'en-US';

        this.speechRecognizer.onresult = (event) => {
          const last = event.results.length - 1;
          const transcript = (event.results[last][0].transcript || '').toUpperCase();
          console.log('[Voice Recognition]', transcript);

          if (transcript.includes('ULTIMATE') || transcript.includes('SHIELD') || transcript.includes('CLEAR') || transcript.includes('EMP') || transcript.includes('BOOM')) {
            const now = Date.now();
            if (now - this.lastEmpTrigger > 5000) {
              this.lastEmpTrigger = now;
              if (onEmpTriggerCallback) onEmpTriggerCallback('KEYWORD: ' + transcript.trim());
            }
          }
        };

        this.speechRecognizer.onerror = (e) => {
          console.warn('[Speech Recognition Error]', e.error);
        };

        try { this.speechRecognizer.start(); } catch (e) {}
      }

      this.playChime();
      return true;
    } catch (err) {
      console.warn('[Mic Access Error]', err);
      alert('Could not enable microphone: ' + err.message);
      this.micActive = false;
      return false;
    }
  }

  getMicVolume() {
    return this.micActive ? this.micVolume : 0.0;
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    this.unlock();
    if (!this.sfxMuted) this.playChime();
    return !this.sfxMuted;
  }

  toggleVoice() {
    this.voiceMuted = !this.voiceMuted;
    if (this.voiceMuted && this.speechSynth) {
      this.speechSynth.cancel();
      this.isSpeaking = false;
    }
    return !this.voiceMuted;
  }

  // --- Sound Effects Synthesizer ---

  playChime() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    [587.33, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.05 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + i * 0.05 + 0.32);
    });
  }

  playSonicEmp() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Sub bass shockwave
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.85);

    oscGain.gain.setValueAtTime(0.35, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.86);

    // Resonant sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(1400, ctx.currentTime);
    sweep.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);

    sweepGain.gain.setValueAtTime(0.2, ctx.currentTime);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    sweep.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(ctx.destination);

    sweep.start(ctx.currentTime);
    sweep.stop(ctx.currentTime + 0.51);
  }

  playLaser() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.Q.setValueAtTime(4, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.29);
  }

  playMeteor() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);

    oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.61);
  }

  playSniperLock() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    [1200, 1600, 2000].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.07);
    });
  }

  playGravityVortex() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(45, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.61);
  }

  playHeal() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + idx * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.31);
    });
  }

  playDash() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.17);
  }

  playPhaseSiren() {
    if (this.sfxMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(740, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.91);
  }

  // --- Real-Time AI Voice Announcer (Speech Synthesis) ---
  speak(text) {
    if (this.voiceMuted || !this.speechSynth || !text) return;
    this.playChime();
    this.speechSynth.cancel();

    const cleanText = text.replace(/[!#_*/`]/g, '');
    const utter = new SpeechSynthesisUtterance(cleanText);

    if (this.selectedVoice) utter.voice = this.selectedVoice;
    utter.rate = 1.12;
    utter.pitch = 1.05;
    utter.volume = 0.95;

    utter.onstart = () => { this.isSpeaking = true; };
    utter.onend = () => { this.isSpeaking = false; };
    utter.onerror = () => { this.isSpeaking = false; };

    this.speechSynth.speak(utter);
  }
}

// Global Singleton
window.audioEngine = new AudioAnnouncerEngine();
