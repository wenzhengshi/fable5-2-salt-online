(() => {
  'use strict';

  if (window.SaltAudioTap) return;

  const AudioNodeProto = window.AudioNode && window.AudioNode.prototype;
  const taps = new WeakMap();

  function destinationFor(context) {
    if (!context || typeof context.createMediaStreamDestination !== 'function') return null;
    let destination = taps.get(context);
    if (destination) return destination;
    try {
      destination = context.createMediaStreamDestination();
      taps.set(context, destination);
      return destination;
    } catch (err) {
      return null;
    }
  }

  if (AudioNodeProto && typeof AudioNodeProto.connect === 'function') {
    const nativeConnect = AudioNodeProto.connect;
    AudioNodeProto.connect = function connect(destination) {
      const result = nativeConnect.apply(this, arguments);
      try {
        const context = this && this.context;
        if (context && destination === context.destination && this !== context.destination) {
          const tap = destinationFor(context);
          if (tap) nativeConnect.call(this, tap);
        }
      } catch (err) { /* audio capture is best-effort */ }
      return result;
    };
  }

  if (AudioNodeProto && typeof AudioNodeProto.disconnect === 'function') {
    const nativeDisconnect = AudioNodeProto.disconnect;
    AudioNodeProto.disconnect = function disconnect(destination) {
      try {
        const context = this && this.context;
        const tap = context ? taps.get(context) : null;
        if (tap && destination === context.destination) {
          nativeDisconnect.call(this, tap, arguments[1], arguments[2]);
        }
      } catch (err) { /* keep the game audio graph running */ }
      return nativeDisconnect.apply(this, arguments);
    };
  }

  function streamFor(context) {
    const destination = destinationFor(context);
    return destination ? destination.stream : null;
  }

  function streamForGame(game) {
    const context = game && game.audio && game.audio.ctx;
    return context ? streamFor(context) : null;
  }

  window.SaltAudioTap = {
    supported: !!(AudioNodeProto && typeof AudioNodeProto.connect === 'function'),
    streamFor,
    streamForGame
  };
})();
