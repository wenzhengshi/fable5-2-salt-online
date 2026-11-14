(() => {
  'use strict';

  // Original Qingyun ambient score, synthesized on Saltline's audio context.
  window.createQingyunAudio = function (context, output) {
    const music = context.createGain();
    music.gain.value = 0;
    music.connect(output);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = .4;
    const fade = context.createGain();
    const start = context.currentTime;
    fade.gain.setValueAtTime(.0001, start);
    fade.gain.exponentialRampToValueAtTime(1, start + 2.5);
    filter.connect(fade).connect(music);

    function tone(frequency, volume, type, destination) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain).connect(destination);
      oscillator.start(start);
      return oscillator;
    }

    const sources = [tone(.07, 180, 'sine', filter.frequency)];
    for (const [frequency, volume, type] of [
      [73.42, .085, 'sine'], [73.9, .06, 'sine'], [110, .05, 'sine'],
      [146.6, .03, 'triangle'], [147.3, .03, 'triangle'], [220.4, .014, 'sine']
    ]) {
      sources.push(tone(frequency, volume, type, filter));
    }

    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 555;
    for (let index = 0; index < samples.length; index++) {
      seed = (seed + 1831565813) | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      samples[index] = ((value ^ value >>> 14) >>> 0) / 2147483648 - 1;
    }
    const wind = context.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 380;
    band.Q.value = .6;
    const windGain = context.createGain();
    windGain.gain.value = .012;
    wind.connect(band).connect(windGain).connect(music);
    wind.start(start);
    sources.push(wind);

    return {
      gain: music.gain,
      stop() {
        for (const source of sources) source.stop();
        music.disconnect();
      }
    };
  };
})();
