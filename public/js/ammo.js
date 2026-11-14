      (() => {
        const SETTINGS_KEY = "saltline.settings.v1";
        const localeText = (source) => {
          try {
            const data = window.__SALT_I18N__;
            const map = data && data.messages && data.messages.gameText;
            return (map && map[source]) || source;
          } catch {
            return source;
          }
        };
        const readInfinite = () => {
          try {
            const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
            return !!(data && data.infiniteAmmo);
          } catch {
            return false;
          }
        };

        let infiniteAmmo = readInfinite();
        const nativeSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === SETTINGS_KEY) {
            try {
              const data = JSON.parse(String(value));
              if (data && typeof data === "object") {
                data.infiniteAmmo = infiniteAmmo;
                value = JSON.stringify(data);
              }
            } catch {}
          }
          return nativeSetItem.call(this, key, value);
        };

        function persist() {
          try {
            const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
            current.infiniteAmmo = infiniteAmmo;
            nativeSetItem.call(localStorage, SETTINGS_KEY, JSON.stringify(current));
          } catch {}
        }

        const hookedWeapons = new WeakSet();
        const finiteReserve = new WeakMap();
        function ensureInfiniteReserve(weapon) {
          if (!weapon || !infiniteAmmo) return;
          if (!finiteReserve.has(weapon)) {
            finiteReserve.set(weapon, Math.max(0, Number(weapon.reserve) || 0));
          }
          const magSize = Math.max(1, Number(weapon.magSize) || 30);
          weapon.reserve = Math.max(Number(weapon.reserve) || 0, magSize * 12);
        }

        function restoreFiniteReserve(weapon) {
          if (!weapon || infiniteAmmo || !finiteReserve.has(weapon)) return;
          weapon.reserve = finiteReserve.get(weapon);
          finiteReserve.delete(weapon);
        }

        function syncWeapon() {
          const weapon = window.__G && window.__G.weapon;
          if (!weapon || typeof weapon.update !== "function") return;

          weapon.infiniteAmmo = infiniteAmmo;
          if (infiniteAmmo) ensureInfiniteReserve(weapon);
          else restoreFiniteReserve(weapon);

          if (hookedWeapons.has(weapon)) return;
          const originalUpdate = weapon.update;
          const originalReset = weapon.reset;
          weapon.update = function () {
            if (this.infiniteAmmo) ensureInfiniteReserve(this);
            const result = originalUpdate.apply(this, arguments);
            if (this.infiniteAmmo) ensureInfiniteReserve(this);
            return result;
          };
          if (typeof originalReset === "function") {
            weapon.reset = function () {
              const result = originalReset.apply(this, arguments);
              if (this.infiniteAmmo) ensureInfiniteReserve(this);
              return result;
            };
          }
          hookedWeapons.add(weapon);
        }

        function updateToggle() {
          const button = document.querySelector('[data-act="infiniteAmmo"]');
          if (!button) return;
          button.setAttribute("aria-pressed", String(infiniteAmmo));
          const state = button.querySelector("span");
          if (state) state.textContent = localeText(infiniteAmmo ? "开" : "关");
        }

        function updateHud() {
          const ammo = document.querySelector(".h-ammo");
          if (ammo) ammo.classList.toggle("infinite", infiniteAmmo);
        }

        function syncAll() {
          syncWeapon();
          updateToggle();
          updateHud();
        }

        function setInfinite(next) {
          infiniteAmmo = !!next;
          persist();
          syncAll();
        }

        function ensureSettingRow() {
          const pane = document.querySelector('.panel-b[data-pane="settings"]');
          if (!pane || pane.querySelector('[data-act="infiniteAmmo"]')) return;

          const row = document.createElement("div");
          row.className = "row";
          row.innerHTML = '<label id="l-inf">' + localeText("无限子弹") + '</label><button class="toggle" data-act="infiniteAmmo" aria-labelledby="l-inf" aria-pressed="false" title="' + localeText("备弹无限，但弹夹打空后仍需换弹") + '"><i></i><span>' + localeText("关") + '</span></button>';
          const invert = pane.querySelector('[data-act="invert"]');
          const invertRow = invert && invert.closest(".row");
          if (invertRow && invertRow.parentNode === pane) invertRow.after(row);
          else pane.insertBefore(row, pane.firstChild);
        }

        function refresh() {
          ensureSettingRow();
          syncAll();
        }

        window.addEventListener("storage", (event) => {
          if (event.key !== SETTINGS_KEY) return;
          infiniteAmmo = readInfinite();
          syncAll();
        });
        document.addEventListener("click", (event) => {
          const button = event.target && event.target.closest && event.target.closest('[data-act="infiniteAmmo"]');
          if (!button) return;
          event.preventDefault();
          setInfinite(!infiniteAmmo);
        }, true);
        window.addEventListener("pageshow", refresh);
        document.addEventListener("DOMContentLoaded", refresh);
        refresh();
        setInterval(refresh, 250);
      })();
