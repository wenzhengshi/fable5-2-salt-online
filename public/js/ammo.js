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

        window.SaltAmmo = {
          get infinite() { return infiniteAmmo; }
        };

        function syncWeapon() {
          const weapon = window.__G?.weapon;
          if (weapon) weapon.infiniteAmmo = infiniteAmmo;
        }

        function sendSetting() {
          window.__mp?.send({ type: "ammoMode", infinite: infiniteAmmo });
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
          sendSetting();
        }

        function ensureSettingRow() {
          const pane = document.querySelector('.panel-b[data-pane="settings"]');
          if (!pane || pane.querySelector('[data-act="infiniteAmmo"]')) return;

          const row = document.createElement("div");
          row.className = "row";
          row.innerHTML = '<label id="l-inf">' + localeText("无限子弹") + '</label><button class="toggle" data-act="infiniteAmmo" aria-labelledby="l-inf" aria-pressed="false" title="' + localeText("开启后无需换弹") + '"><i></i><span>' + localeText("关") + '</span></button>';
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
          sendSetting();
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
