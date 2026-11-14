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

    function aiming() {
      const unit = window.__mp?.soldier;
      return game.game.state === 'playing' && game.player.alive && game.player.enabled &&
        game.input.ads && !window.__saltBoat?.riding && !game.weapon.stub && !['drone', 'hound'].includes(unit);
    }

    game.renderer.domElement.addEventListener('wheel', event => {
      if (!aiming() || !event.deltaY || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      index = Math.max(0, Math.min(powers.length - 1, index - Math.sign(event.deltaY)));
    }, { passive: false });

    game.rifleScope = {
      get power() { return aiming() ? powers[index] : 1; },
      update() {
        const power = this.power;
        const visible = power > 1 && game.weapon.ads > .65;
        scope.hidden = !visible;
        const text = power + '×';
        if (visible && label.textContent !== text) label.textContent = text;
        return visible;
      }
    };
  };
})();
