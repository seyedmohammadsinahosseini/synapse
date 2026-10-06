/**
 * Web Audio API Ambient Sound Synthesizer & Meditation Chime.
 * 100% offline, zero external audio asset dependencies, instantaneous response.
 */

class AmbientSoundEngine {
  constructor() {
    this.ctx = null
    this.currentSource = null
    this.gainNode = null
    this.activeType = 'mute'
    this.volume = 0.5
    this.isMuted = false
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val))
    if (this.gainNode && !this.isMuted) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx ? this.ctx.currentTime : 0)
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx ? this.ctx.currentTime : 0)
    }
    return this.isMuted
  }

  stop() {
    if (this.currentSource) {
      try {
        if (typeof this.currentSource.stop === 'function') {
          this.currentSource.stop()
        }
        if (this.currentSource.disconnect) {
          this.currentSource.disconnect()
        }
      } catch (e) {}
      this.currentSource = null
    }
  }

  play(type) {
    this._init()
    if (!this.ctx) return
    this.stop()
    this.activeType = type

    if (type === 'mute' || !type) return

    this.gainNode = this.ctx.createGain()
    this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime)
    this.gainNode.connect(this.ctx.destination)

    if (type === 'rain') {
      this._playRain()
    } else if (type === 'waves') {
      this._playWaves()
    } else if (type === 'whitenoise') {
      this._playWhiteNoise()
    } else if (type === 'alpha') {
      this._playAlphaWaves()
    }
  }

  _createNoiseBuffer(seconds = 5) {
    const bufferSize = this.ctx.sampleRate * seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0.0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      // Pink / Brown noise filter
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3.5
    }
    return buffer
  }

  _playRain() {
    const buffer = this._createNoiseBuffer(6)
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900, this.ctx.currentTime)

    noise.connect(filter)
    filter.connect(this.gainNode)
    noise.start()
    this.currentSource = noise
  }

  _playWaves() {
    const buffer = this._createNoiseBuffer(8)
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(320, this.ctx.currentTime)
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime)

    // LFO modulator for wave swell
    const lfo = this.ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime) // 8-second wave period
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.setValueAtTime(240, this.ctx.currentTime)
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()

    noise.connect(filter)
    filter.connect(this.gainNode)
    noise.start()
    this.currentSource = {
      stop: () => {
        noise.stop()
        lfo.stop()
      },
      disconnect: () => {
        noise.disconnect()
        lfo.disconnect()
      }
    }
  }

  _playWhiteNoise() {
    const bufferSize = this.ctx.sampleRate * 4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.18
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime)

    noise.connect(filter)
    filter.connect(this.gainNode)
    noise.start()
    this.currentSource = noise
  }

  _playAlphaWaves() {
    // 432 Hz Binaural Beat (432Hz in Left, 442Hz in Right -> 10Hz Alpha Brainwave)
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(432, this.ctx.currentTime)

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(442, this.ctx.currentTime)

    const oscGain = this.ctx.createGain()
    oscGain.gain.setValueAtTime(0.22, this.ctx.currentTime)

    osc1.connect(oscGain)
    osc2.connect(oscGain)
    oscGain.connect(this.gainNode)

    osc1.start()
    osc2.start()

    this.currentSource = {
      stop: () => {
        osc1.stop()
        osc2.stop()
      },
      disconnect: () => {
        osc1.disconnect()
        osc2.disconnect()
      }
    }
  }

  playChime() {
    this._init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(528, now) // Solfeggio 528 Hz healing chime
    osc.frequency.exponentialRampToValueAtTime(1056, now + 0.8)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 3.3)
  }
}

export const soundEngine = new AmbientSoundEngine()
