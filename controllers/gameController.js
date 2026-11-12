const startedAt = Date.now();
const {
  getLeaderboard,
  getOnlinePlayers,
  RESPAWN_MS
} = require('../realtime/multiplayer');
const contentFilter = require('../services/contentFilter');
const chatHistoryStore = require('../services/chatHistory');

module.exports = {
  health(req, res) {
    res.json({
      ok: true,
      message: req.t('api.health'),
      lang: req.lang,
      uptimeSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
    });
  },

  meta(req, res) {
    const chatStorage = chatHistoryStore.status();
    res.json({
      ok: true,
      lang: req.lang,
      title: req.t('game.title'),
      tagline: req.t('game.tagline'),
      version: '1.21.8',
      engine: 'WebGL2 / Three.js (bundled) + Canvas 2D fallback',
      rendering: {
        primary: 'webgl2',
        fallback: 'canvas2d',
        autoFallback: true
      },
      mode: 'free-for-all',
      respawnSeconds: Math.round(RESPAWN_MS / 1000),
      characters: [
        { id: 'male', name: req.t('soldierSelect.maleName'), role: req.t('soldierSelect.maleRole') },
        { id: 'female', name: req.t('soldierSelect.femaleName'), role: req.t('soldierSelect.femaleRole') },
        { id: 'hound', name: req.t('soldierSelect.houndName'), role: req.t('soldierSelect.houndRole') },
        { id: 'drone', name: req.t('soldierSelect.droneName'), role: req.t('soldierSelect.droneRole') }
      ],
      online: getOnlinePlayers().length,
      websocket: '/ws',
      moderation: contentFilter.descriptor(),
      comms: {
        voice: 'server-pcm-relay',
        sampleRate: 16000,
        frameMs: 20,
        globalAudience: true,
        listenerMicRequired: false,
        bigText: true,
        chatMaxLength: 80,
        chatCooldownMs: 1200,
        chatHistory: {
          endpoint: '/api/game/chat/history',
          persisted: chatStorage.persisted && chatStorage.writable,
          storage: chatStorage.file,
          dataDir: chatStorage.dataDir,
          dataSource: chatStorage.dataSource,
          records: chatStorage.records,
          pending: chatStorage.pending,
          lastWriteAt: chatStorage.lastWriteAt,
          pageSize: 20,
          maxPageSize: 50
        }
      },
      controls: [
        { keys: 'WASD', label: req.t('controls.move') },
        { keys: 'Mouse', label: req.t('controls.look') },
        { keys: 'LMB', label: req.t('controls.fire') },
        { keys: 'RMB', label: req.t('controls.aim') },
        { keys: 'R', label: req.t('controls.reload') },
        { keys: 'E', label: req.t('controls.interact') },
        { keys: 'Space', label: req.t('controls.jump') },
        { keys: 'Shift', label: req.t('controls.sprint') },
        { keys: 'F', label: req.t('controls.melee') },
        { keys: 'M', label: req.t('controls.mic') },
        { keys: 'T', label: req.t('controls.bigText') },
        { keys: 'Tab', label: req.t('controls.roster') },
        { keys: 'Esc / P', label: req.t('controls.pause') }
      ]
    });
  },

  chatHistory(req, res) {
    const storageStatus = chatHistoryStore.status();
    const page = chatHistoryStore.list({
      before: req.query && req.query.before,
      limit: req.query && req.query.limit
    });
    res.json({
      ok: true,
      lang: req.lang,
      persisted: storageStatus.persisted && storageStatus.writable,
      storage: storageStatus.file,
      dataDir: storageStatus.dataDir,
      dataSource: storageStatus.dataSource,
      pending: storageStatus.pending,
      messages: page.messages,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      total: page.total,
      limit: page.limit
    });
  },

  leaderboard(req, res) {
    const online = getOnlinePlayers();
    res.json({
      ok: true,
      lang: req.lang,
      online: online.length,
      players: online,
      respawnSeconds: Math.round(RESPAWN_MS / 1000),
      leaderboard: getLeaderboard(req.query && req.query.limit)
    });
  }
};
