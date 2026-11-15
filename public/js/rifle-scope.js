(() => {
  'use strict';

  window.installRifleScope = function (game) {
    const powers = [1, 2, 3, 4, 6, 8];
    let index = 0;
    const scope = document.createElement('div');
    scope.className = 'rifle-scope';
    scope.hidden = true;
    scope.setAttribute('aria-hidden', 'true');
    scope.innerHTML = '<i></i><b></b>';
    document.getElementById('ui').appendChild(scope);
    const label = scope.querySelector('b');
    const english = document.documentElement.lang === 'en-US';
    const zoom = document.createElement('div');
    zoom.className = 'scope-zoom-tools';
    zoom.hidden = true;
    const down = document.createElement('button');
    const up = document.createElement('button');
    const readout = document.createElement('output');
    down.type = up.type = 'button';
    down.textContent = '−';
    up.textContent = '+';
    down.setAttribute('aria-label', english ? 'Decrease zoom' : '降低倍镜倍率');
    up.setAttribute('aria-label', english ? 'Increase zoom' : '提高倍镜倍率');
    zoom.append(down, readout, up);
    document.body.appendChild(zoom);

    function adjust(step) {
      index = Math.max(0, Math.min(powers.length - 1, index + step));
    }
    down.addEventListener('click', () => { if (aiming()) adjust(-1); });
    up.addEventListener('click', () => { if (aiming()) adjust(1); });

    function aiming() {
      const unit = window.__mp?.soldier;
      return !game.roadSigns?.editing && game.game.state === 'playing' && game.player.alive && game.player.enabled &&
        game.input.ads && !window.__saltBoat?.riding && !game.weapon.stub && !['drone', 'hound'].includes(unit);
    }

    game.renderer.domElement.addEventListener('wheel', event => {
      if (!aiming() || !event.deltaY || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      adjust(-Math.sign(event.deltaY));
    }, { passive: false });

    game.rifleScope = {
      get power() { return aiming() ? powers[index] : 1; },
      update() {
        const power = this.power;
        const visible = power > 1 && game.weapon.ads > .65;
        scope.hidden = !visible;
        const text = power + '×';
        const adjusting = game.input.touch && aiming();
        if (zoom.hidden === adjusting) zoom.hidden = !adjusting;
        if (adjusting) {
          if (readout.textContent !== text) readout.textContent = text;
          if (down.disabled !== (index === 0)) down.disabled = index === 0;
          if (up.disabled !== (index === powers.length - 1)) up.disabled = index === powers.length - 1;
        }
        if (visible && label.textContent !== text) label.textContent = text;
        return visible;
      }
    };
  };
})();
