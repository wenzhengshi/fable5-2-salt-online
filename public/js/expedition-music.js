(() => {
  'use strict';

  const tracks = new Set(['bayhaven', 'dustfall', 'mothlight']);

  window.createExpeditionMusic = (context, output) => {
    const cache = new Map();
    let desired = null;
    let current = null;
    let loading = null;
    let retryAt = 0;
    let portDuck = 0;

    function load(id) {
      if (!cache.has(id)) {
        cache.set(id, fetch('/audio/maps/' + id + '.mp3')
          .then(response => {
            if (!response.ok) throw new Error('Map music: ' + response.status);
            return response.arrayBuffer();
          })
          .then(bytes => context.decodeAudioData(bytes))
          .catch(error => { cache.delete(id); throw error; }));
      }
      return cache.get(id);
    }

    function stop(track) {
      const now = context.currentTime;
      const volume = track.gain.gain;
      if (volume.cancelAndHoldAtTime) volume.cancelAndHoldAtTime(now);
      else {
        const level = volume.value;
        volume.cancelScheduledValues(now);
        volume.setValueAtTime(level, now);
      }
      volume.setTargetAtTime(0, now, .11);
      track.source.stop(now + .65);
    }

    function open(id) {
      const request = {};
      loading = request;
      load(id).then(buffer => {
        if (desired !== id || loading !== request) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain).connect(output);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start();
        current = { source, gain };
      }).catch(() => { if (loading === request) retryAt = context.currentTime + 5; })
        .finally(() => { if (loading === request) loading = null; });
    }

    return {
      update(id, paused, dt) {
        id = tracks.has(id) ? id : null;
        if (desired !== id) {
          desired = id;
          loading = null;
          retryAt = 0;
          if (current) stop(current);
          current = null;
        }
        if (id && !current && !loading && context.currentTime >= retryAt) open(id);
        if (current) current.gain.gain.setTargetAtTime(paused ? .15 : .62, context.currentTime, .13);
        portDuck += (Number(!!current) - portDuck) * (1 - Math.exp(-dt * 5));
        return 1 - portDuck;
      }
    };
  };
})();
