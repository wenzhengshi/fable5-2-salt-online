/*
  机械猎犬被击杀 → 后空翻概率：客户端侧接收端
  ------------------------------------------------------------------------------------
  · 页面加载时：服务端已在 index.ejs 注入 window.__SALT_FLIP__（0~1）
  · 运行期：后台 /admin/tuning 保存后，服务端广播 { type: 'houndFlip', chance }
            这里收到就覆盖 window.__SALT_FLIP__，下一只猎犬被击杀时就用新值
  · 断线重连后再入场，页面不刷新也不会丢：重连后服务端不会重发，但 window 上的值仍在
  · 服务端没部署这套东西时：window.__SALT_FLIP__ 不存在，bundle 回落 Gt.flipDieChance(0.5)
*/
(() => {
  'use strict';

  function apply(value) {
    if (typeof value !== 'number' || !(value >= 0 && value <= 1)) return false;
    window.__SALT_FLIP__ = value;
    return true;
  }

  // 页面注入值本身的合法性兜底（万一模板被改坏，别把概率搞成 NaN/无限）
  if (typeof window.__SALT_FLIP__ !== 'number' || !(window.__SALT_FLIP__ >= 0 && window.__SALT_FLIP__ <= 1)) {
    delete window.__SALT_FLIP__;
  }

  let hooked = false;
  function hook() {
    const mp = window.__mp;
    if (!mp || typeof mp.onMessage !== 'function') return false;
    mp.onMessage((msg) => {
      if (!msg || msg.type !== 'houndFlip') return;
      apply(msg.chance);
    });
    hooked = true;
    return true;
  }

  // multiplayer.js 在本文件之前加载，正常一次就成功；万一顺序变了，最多重试 20 秒
  if (!hook()) {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (hook() || tries >= 40) window.clearInterval(timer);
    }, 500);
  }

  window.SaltHoundFlip = {
    get chance() {
      return typeof window.__SALT_FLIP__ === 'number' ? window.__SALT_FLIP__ : null;
    },
    set: apply,
    hooked: () => hooked
  };
})();
