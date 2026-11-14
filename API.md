# 盐线行动 API 文档

## 概览

- 运行方式：`npm install --omit=dev` 后执行 `npm start`（等价 `node index.js`）
- 运行环境：Node.js 18+，CommonJS
- 监听地址：从环境变量 `PORT` / `HOST` 读取
- 页面地址：`http://$HOST:$PORT/`
- 实时通信：同端口 WebSocket，玩家路径 `/ws`
- 数据格式：WebSocket 文本帧为 JSON；玩家语音为二进制 PCM 帧
- 国际化：`lang` cookie，可选 `zh-CN` / `en-US`；接口提示文案随语言变化
- 持久化目录：优先使用托管平台注入的 `JICREATE_DATA_DIR`，其次 `DATA_DIR`，本地开发回退到项目内 `data/`。排行榜写入 `data/leaderboard.json`，大字历史追加写入 `data/chat-history.jsonl`，专注记录写入 `data/focus-records.json`，连续游玩计时写入 `data/play-sessions.json`，统一由 `config/storage.js` 原子读写。项目内 `data/` 会自动调整为 `2777` 目录权限，数据文件为 `0664`，避免临时托管重复测试时因跨服务账号无法清理运行数据而还原失败；外部 `JICREATE_DATA_DIR` 不改权。
- 落盘策略：正常时同步追加并 `fsync` 后再广播；若部署目录暂时不可写，大字仍会立即广播，同时进入进程内重试队列，每 4 秒自动重试并通过 `chatWarning` 提醒发送者。历史接口会返回尚未落盘的 `pending` 记录。进程收到 `SIGTERM` / `SIGINT` 时会最后重试一次并同步排行榜与大字文件。
- API 缓存：`/api/*` 统一返回 `Cache-Control: no-store`，避免历史分页被浏览器或代理缓存成空列表。
- 内容安全：玩家代号与全服大字在服务端统一做敏感词过滤；拆字、全角、零宽字符、符号替代与常见同形字规避同样会被识别。
- 当前版本：`1.25.2`，仅保留 WebGL2 + Three.js 三维渲染；客户端会先在实际游戏画布上异步重试并预热 WebGL2 上下文，再加载游戏 bundle，成功上下文由 Three.js 主渲染器直接复用。渲染器、单位预览与死亡回放继续优先请求 `high-performance`，上下文创建失败时按兼容属性回退。远端玩家操控的机器狗与无人机稳定复用游戏内骨骼单位模型，模型模块晚于首个快照加载时也会自动升级，不再永久回退为方块模型。撤离船升级为任务前置可用的四人多人载具，服务端同步船位、舵手、乘客、坐标、朝向和速度；外海新增带碰撞与复活点的交战平台。死亡回放仍由服务端以 10 Hz 录制双方真实轨迹、枪口弹道与命中事件，再通过 `youDied.replay` 下发给被击杀者。本地回放通过 WebAudio 分流同时录制游戏音效，音轨仅进入本机 `MediaRecorder`，不读取麦克风、不上传服务器。版本号统一从 `package.json` 读取，发布前可运行 `npm run release:check` 检查托管完整性。

## 页面

### 首页（游戏）

- 方法：`GET`
- 路径：`/`
- 参数：可选 `?lang=zh-CN` 或 `?lang=en-US`，会同步写入 `lang` cookie
- 说明：多人 3D 港口枪战首页。玩家可直接部署，并通过“设置 → 操控单位”在男女士兵、机器狗、无人机和方块人之间切换；未主动选择时默认方块人。方块人沿用男士兵的移动、命中、伤害与复活参数。其他玩家看到的机器狗与无人机直接复用游戏内的骨骼单位模型；若首个快照早于模型模块加载，客户端会持续等待并自动替换临时兜底。页面提供社区二维码、1–6 连杀播报、含游戏音效的本地录制回放和 Three.js 三维死亡回放；本地回放通过 `audio-tap.js` 将游戏 WebAudio 主输出分流到录制流，视频与音轨均只保存在浏览器 IndexedDB，不读取麦克风。死亡回放使用服务端录制的双方权威轨迹与真实射击、命中事件重建港口集装箱、吊机、灯塔和击杀过程，并提供追踪镜头与播放进度。无人机近地搜索灯与机械单位坠毁均为客户端表现。游戏仅使用 WebGL2 + Three.js 三维渲染，不提供 Canvas 2D 兼容模式，也不再识别 `?gfx=2d` / `?render=2d`；WebGL2 不可用时显示启动错误。移动、命中、快照、限频、反作弊、语音、专注锁定和复活继续使用 v1.23.0 算法。游戏内标题页、暂停菜单与战场名单面板均提供 GitHub 仓库链接 `https://github.com/wenzhengshi/fable5-2-salt-online`。
- 缓存：`Cache-Control: no-store`

### 静态资源

- 方法：`GET`
- 路径：`/css/*`、`/js/*`、`/models/*`
- 说明：游戏样式、Three.js 游戏 bundle、`audio-tap.js` WebAudio 分流、多人对战、`sail.js` 多人撤离船与外海交战区、`death-replay-3d.js` 三维死亡回放、全服开麦语音与大字客户端脚本、男女士兵 GLB 模型、PAC-9 步枪模型，以及机器狗/无人机单位模型脚本。机器狗和无人机直接复用游戏 bundle 内的 `hound` / `gull` 敌人建模与材质；死亡回放和船只系统复用游戏 bundle 暴露的 Three.js，不新增服务端依赖或模型请求。

## 内容安全与敏感词拦截

- 生效范围：`join` / `rename` 的玩家代号、`chat` 全服大字、从 `data/chat-history.jsonl` 载入的历史大字，以及从 `data/leaderboard.json` 载入的历史排行榜代号。
- 代号：命中敏感词的实时改会被拒绝，服务端返回 `nameDenied`，原代号保持不变；首次 `join` 命中时会自动分配安全代号，并在 `joined` 中标记 `filtered: true`。
- 大字：命中敏感词时整条消息不会广播，服务端返回 `chatDenied`（`reason: "filtered"`），并计入 1200 ms 冷却；前端会保留本次输入便于修改。
- 大字历史：写入前与读取时都会过滤；命中敏感词的消息不会广播，也不会出现在历史分页中。
- 排行榜：历史数据中命中敏感词的代号不会加载、展示或继续累加战绩。
- 规避识别：服务端会归一化 Unicode NFKC、大小写、全角字符、零宽/控制字符、变音符号、标点与空格拆字、数字/符号替代（如 `sh1t`、`a$$hole`）和常见西里尔/希腊同形字，并容忍重复字符。
- 过滤类别：`profanity`、`sexual`、`hate`、`violence`、`evasion`、`profanity-zh`、`sexual-zh`。

## 公共 API

### 健康检查

- 方法：`GET`
- 路径：`/api/health`
- 参数：无
- 返回示例：`{"ok":true,"message":"服务正常","lang":"zh-CN","uptimeSeconds":12}`

### 游戏元信息

- 方法：`GET`
- 路径：`/api/game/meta`
- 返回字段：
  - `mode`：`free-for-all`
  - `respawnSeconds`：复活等待秒数，当前为 `5`
  - `characters`：可选操控单位列表，`id` 为 `male` / `female` / `hound` / `drone` / `classic`，`name` 与 `role` 随语言返回
  - `online`：当前 WebSocket 在线连接数
  - `websocket`：`/ws`
  - `engine`：`WebGL2 / Three.js (bundled)`
  - `rendering.mode`：固定为 `3d`
  - `rendering.primary`：主渲染器 `webgl2`
  - `rendering.modes`：支持的渲染模式列表，固定为 `["webgl2"]`
  - `rendering.fallback`：固定为 `null`，不存在 2D 降级渲染器
  - `rendering.autoFallback`：固定为 `false`
  - `rendering.requiresWebGL2`：是否强制要求 WebGL2
  - `rendering.coldStartRecovery`：是否启用浏览器冷启动 WebGL2 异步重试
  - `rendering.contextReuse`：预热成功的上下文是否交给主渲染器复用
  - `rendering.maxContextAttempts`：冷启动阶段最多尝试次数，当前为 `8`
  - `features.deathReplay`：是否启用死亡回放
  - `features.deathReplay3d`：死亡回放是否使用 Three.js 三维追踪镜头
  - `moderation.enabled`：内容安全过滤是否启用
  - `moderation.names` / `moderation.chat`：代号与大字是否启用过滤
  - `moderation.evasionResistant`：是否启用拆字与同形字规避识别
  - `moderation.categories`：当前过滤类别列表
  - `focusMode.durationMinutes`：兼容字段，等同手动专注固定时长 `30`
  - `focusMode.manualDurationMinutes`：手动专注固定时长 `30`
  - `focusMode.autoDurationMinutes`：连续游玩触发的强制专注时长 `20`
  - `focusMode.continuousPlayLimitMinutes`：连续游玩触发阈值 `240`
  - `focusMode.continuousResetMinutes`：连续游玩中断判定，当前为 `5` 分钟
  - `focusMode.enforcement`：`server`，表示操作锁定由服务端强制执行
  - `focusMode.autoSpectate`：是否自动切换观战视角
  - `focusMode.storage`：专注记录持久化文件 `focus-records.json`
  - `focusMode.playStorage`：连续游玩计时文件 `play-sessions.json`
  - `focusMode.playPersistence`：连续游玩计时存储诊断，字段与 `focusMode.persistence` 相同
  - `focusMode.records`：登记字段 `clientId`、`fingerprint`、`ip`
  - `focusMode.persistence`：专注记录存储诊断，包含 `persisted`、`pending`、`writable`、`dataDir`、`dataSource`、`lastWriteAt`、`lastError`
  - `comms.voice`：`server-pcm-relay`
  - `comms.sampleRate`：`16000`
  - `comms.frameMs`：`20`
  - `comms.globalAudience`：`true`
  - `comms.listenerMicRequired`：`false`
  - `comms.chatHistory.endpoint`：大字历史分页接口 `/api/game/chat/history`
  - `comms.chatHistory.storage`：持久化文件逻辑路径 `data/chat-history.jsonl`
  - `comms.chatHistory.dataDir`：当前实际写入目录（来自宿主环境或项目 `data/`）
  - `comms.chatHistory.dataSource`：目录来源，`JICREATE_DATA_DIR`、`DATA_DIR` 或 `project`
  - `comms.chatHistory.records`：当前已加载的历史记录总数
  - `comms.chatHistory.pending`：已广播但尚未成功落盘、正在自动重试的记录数
  - `comms.chatHistory.lastWriteAt`：最近一条已落盘消息的时间戳
  - `comms.chatHistory.pageSize` / `maxPageSize`：默认每页 `20` 条，最大 `50` 条
  - `comms.chatHistory.persisted`：`true` 表示当前目录可写且没有待重试记录
  - `controls`：本地化操作列表；仅保留移动、观察、射击、瞄准、换弹、交互、跳跃、冲刺、近战、语音、大字、名单与暂停
- 返回示例：`{"ok":true,"version":"1.25.2","engine":"WebGL2 / Three.js (bundled)","rendering":{"mode":"3d","primary":"webgl2","modes":["webgl2"],"fallback":null,"autoFallback":false,"requiresWebGL2":true,"coldStartRecovery":true,"contextReuse":true,"maxContextAttempts":8},"mode":"free-for-all","respawnSeconds":5,"characters":[{"id":"male","name":"男士兵","role":"重装突击手"},{"id":"female","name":"女士兵","role":"先锋侦察兵"},{"id":"hound","name":"机器狗","role":"四足突击平台"},{"id":"drone","name":"无人机","role":"空中侦察平台"},{"id":"classic","name":"方块人","role":"怀旧方块兵"}],"features":{"localReplay":true,"localReplayAudio":true,"deathReplay":true,"deathReplay3d":true,"deathReplayAuthoritative":true,"deathReplayRateHz":10,"deathReplayWindowMs":4500,"multiplayerBoat":true,"boatSeats":4,"boatMissionRequired":false,"externalCombatZone":true},"websocket":"/ws","moderation":{"enabled":true,"names":true,"chat":true,"evasionResistant":true},"focusMode":{"durationMinutes":30,"manualDurationMinutes":30,"autoDurationMinutes":20,"continuousPlayLimitMinutes":240,"continuousResetMinutes":5,"enforcement":"server","autoSpectate":true,"storage":"focus-records.json","playStorage":"play-sessions.json","records":["clientId","fingerprint","ip"]},"comms":{"voice":"server-pcm-relay","sampleRate":16000,"frameMs":20,"globalAudience":true,"listenerMicRequired":false,"chatHistory":{"endpoint":"/api/game/chat/history","persisted":true,"storage":"data/chat-history.jsonl","dataDir":"/srv/runtime-data/data","dataSource":"JICREATE_DATA_DIR","records":42,"pending":0}},"controls":[{"keys":"WASD","label":"移动"}]}`

### 排行榜与在线列表

- 方法：`GET`
- 路径：`/api/game/leaderboard`
- 参数：可选 `?limit=1..100`，默认 `20`
- 返回字段：`online`、`respawnSeconds`、`players[]`、`leaderboard[]`
- 说明：战绩在击杀 / 死亡时累加，并异步写回 `data/leaderboard.json`（保留前 300 条）。命中敏感词的历史代号会被过滤，不会出现在在线列表或排行榜中。

### 大字历史分页

- 方法：`GET`
- 路径：`/api/game/chat/history`
- 参数：
  - `limit`：可选，每页条数，默认 `20`，范围 `1..50`
  - `before`：可选，上一页返回的 `nextCursor`；不传时返回最新一页
- 返回字段：`persisted`、`storage`、`dataDir`、`dataSource`、`pending`、`messages[]`、`nextCursor`、`hasMore`、`total`、`limit`
- `messages[]` 按新到旧排列，每项含 `id`（大字记录 ID）、`playerId`、`name`、`color`、`text`、`at`、`pending`。`pending: true` 表示该消息已广播但仍在等待重试落盘。
- 说明：记录来自 `data/chat-history.jsonl`，读取时会对比文件大小与修改时间，确保服务重启或外部写入后仍以磁盘内容为准；前端滚动到列表底部时携带 `before` 自动加载更早一页。命中敏感词或损坏的记录会被忽略。
- 返回示例：`{"ok":true,"lang":"zh-CN","persisted":true,"storage":"data/chat-history.jsonl","dataDir":"/srv/runtime-data/data","dataSource":"JICREATE_DATA_DIR","pending":0,"messages":[{"id":"c12","playerId":"p3","name":"RAVEN-42","color":"#ffb347","text":"跟我推进！","at":1794500000000,"pending":false}],"nextCursor":"c12","hasMore":true,"total":48,"limit":20}`

### 问候接口

- 方法：`GET`
- 路径：`/api/hello`
- 返回示例：`{"message":"你好，世界！"}`

### 专注状态与连续游玩进度

- 方法：`GET`
- 路径：`/api/focus/status`
- 参数：
  - `clientId`：浏览器持久化的本机标识
  - `fingerprint`：浏览器指纹摘要；`clientId` 与 `fingerprint` 至少提供一个
- 返回字段：`focus.active`、`focus.durationMs`、`focus.manualDurationMs`、`focus.autoDurationMs`、`focus.continuousPlayLimitMs`、`focus.record`、`play`
- `focus.record` 仅在锁定生效时返回，包含 `id`（专注记录 ID）、`clientId`、脱敏后的 `fingerprint` / `ip`、`startedAt`、`expiresAt`、`durationMs`、`remainingMs`、`kind`（`manual` / `auto`）、`trigger`、`playMs`
- `play` 返回连续游玩状态：`continuousMs`（当前连续战斗时长）、`limitMs`（`14400000`）、`remainingMs`、`autoDurationMs`（`1200000`）、`resetAfterMs`（`300000`）、`lastActiveAt`
- 说明：服务端以 `clientId` 或 `fingerprint` 匹配有效专注记录；页面刷新、WebSocket 重连后仍保持只读锁定。连续游玩按 WebSocket `state.active: true` 的实际战斗时间累计，暂停或离开战斗超过 5 分钟后重新累计
- 返回示例：`{"ok":true,"now":1794500000000,"focus":{"active":true,"durationMs":1200000,"manualDurationMs":1800000,"autoDurationMs":1200000,"continuousPlayLimitMs":14400000,"record":{"id":"focus_m7x2_a1b2c3d4","clientId":"c_...","fingerprint":"fp1-ab…9f2c","ip":"203.0.*.*","startedAt":1794500000000,"expiresAt":1794501200000,"durationMs":1200000,"remainingMs":1200000,"kind":"auto","trigger":"continuous_play","playMs":14400000,"active":true}},"play":{"enabled":true,"active":true,"continuousMs":0,"limitMs":14400000,"remainingMs":14400000,"autoDurationMs":1200000,"resetAfterMs":300000,"lastActiveAt":1794500000000}}`

自动强制专注规则：

- 服务端按 `clientId`（缺失时用 `fingerprint`）累计实际战斗时间；同一设备多个标签页不会重复计时。
- 连续游玩达到 4 小时时，服务端自动创建 20 分钟 `kind: "auto"` 记录、立即通过 WebSocket 锁定当前会话，并将本轮计时归零。
- 计时每 15 秒尽量原子写入 `data/play-sessions.json`；写盘失败不会中断计时或锁定，进程退出时会最后补写一次。
- 自动专注同样不可跳过；到期后恢复出生并可重新累计下一轮 4 小时。

### 开启手动专注模式

- 方法：`POST`
- 路径：`/api/focus/start`
- Body：`{"clientId":"c_...","fingerprint":"fp1-..."}`
- 说明：固定手动锁定 30 分钟，不接受客户端指定更短时长；已存在有效记录时复用原到期时间，不会因重复提交延长。服务端会同步锁定该 `clientId` / `fingerprint` 对应的在线 WebSocket 会话，并记录请求 IP。自动强制专注由服务端内部创建，不通过此接口触发。
- 返回字段：`focus.active`、`focus.record`、`reused`、`persisted`（审计记录是否已落盘）、`sessions`（本次同步锁定的在线会话数）
- 状态码：首次创建 `201`；已有有效记录 `200`
- 容错说明：托管数据目录或文件锁暂时不可写时，服务端仍会立即建立内存锁定并返回成功，`persisted` 为 `false`；记录会每 4 秒自动重试原子写入，进程收到 `SIGTERM` / `SIGINT` 时也会再次补写。单次 WebSocket 会话同步异常同样不会改变成功状态码。
- 返回示例：`{"ok":true,"now":1794500000000,"reused":false,"persisted":true,"sessions":1,"focus":{"active":true,"durationMs":1800000,"record":{"id":"focus_m7x2_a1b2c3d4","clientId":"c_...","fingerprint":"fp1-ab…9f2c","ip":"203.0.*.*","startedAt":1794500000000,"expiresAt":1794501800000,"durationMs":1800000,"remainingMs":1800000,"kind":"manual","trigger":"manual","playMs":0,"active":true}},"message":"手动专注模式已开启，30 分钟内只能观战"}`

### 切换语言

- 方法：`POST`
- 路径：`/api/lang`
- Body：`{"lang":"zh-CN"}` 或 `{"lang":"en-US"}`
- 说明：写入有效期一年的 `lang` cookie；非法值回退为 `zh-CN`。

## WebSocket `/ws`

### 连接

- 地址：`ws://$HOST:$PORT/ws?clientId=<id>&fingerprint=<fp>`（HTTPS 页面使用 `wss://`）
- 协议：JSON 文本帧用于游戏状态与聊天；二进制帧用于玩家语音
- 心跳：服务端每 30 秒发送 WebSocket ping
- 鉴权：无需登录；连接后获得临时玩家 ID（如 `p12`）
- 专注锁定：连接时携带 `clientId` 与 `fingerprint`；若命中有效手动或自动专注记录，服务端立即把会话设为只读观战，重连后仍生效

### 客户端 → 服务端（文本）

| `type` | 字段 | 说明 |
| --- | --- | --- |
| `join` | `name`, `soldier`, `spawns[]` | 设置代号、操控单位（`male` / `female` / `hound` / `drone`）与可用出生点；非法单位值回退为 `male`。代号命中敏感词时自动分配安全代号，并在 `joined` 中返回 `filtered: true` |
| `soldier` | `soldier` | 游戏过程中切换操控单位；服务端校验后广播 `soldierState`，非法值回退为 `male` |
| `spawns` | `spawns[]` | 更新出生点列表，最多 32 个 |
| `chat` | `text` | 全服大字，最长 80 字，冷却 1200 ms；命中敏感词返回 `chatDenied` 且不广播。通过校验的消息会立即广播并尽力同步写入 `data/chat-history.jsonl`；写盘失败时仍广播，同时进入自动重试队列，并向发送者发送 `chatWarning` |
| `voiceState` | `enabled`, `muted`, `speaking` | 同步麦克风开关、静音、说话状态 |
| `rename` | `name` | 修改代号，最长 16 字；命中敏感词返回 `nameDenied` 并保留原代号 |
| `state` | `pos`, `yaw`, `pitch`, `active`, `visible`, `moving`, `sprint` | 10 Hz 位置与动作状态；仅同步移动与冲刺，蹲伏和趴下已移除。服务端仅在 `active: true` 且 `visible` 不为 `false` 时累计连续游玩时间，达到 4 小时会立即下发自动专注锁定 |
| `shot` | `origin`, `dir` | 射击特效广播 |
| `hit` | `targetId` | 命中判定，服务端校验距离与保护状态 |
| `died` | 无 | 主动上报死亡 |
| `respawn` | 无 | 请求复活；死亡后至少等待 5 秒 |
| `boatBoard` | `seat?` | 请求登上撤离船；`seat: 0` 表示接管舵位，省略时选择首个空位。仅允许存活、未专注且距离船 8 米内的玩家；驾驶资格无需先完成任务 |
| `boatLeave` | 无 | 请求下船；仅允许船速低于 2.4 米/秒，且船位于撤离码头或外海平台附近 |
| `boatPose` | `pos`, `heading`, `speed` | 舵手以不超过 20 Hz 的频率同步船只坐标、朝向和速度；服务端校验舵手身份、单步位移和海面半径 |
| `boatInvite` | 无 | 舵手向全服发送船只集合广播，冷却 2200 ms |
| `focusEnd` | 无 | 手动 30 分钟或自动 20 分钟到期后请求结束只读观战并恢复出生；未到期时返回 `focusState.denied: true` |
| `ping` | `t` | 延迟探测，服务端回 `pong` |

专注锁定期间，`state`、`soldier`、`spawns`、`chat`、`voiceState`、`rename`、`shot`、`hit`、`died`、`respawn`、`boatBoard`、`boatLeave`、`boatPose`、`boatInvite` 均被服务端拒绝；只允许 `join`、`focusEnd` 与 `ping`。二进制语音帧同样不会转发。

### 客户端 → 服务端（二进制）

- 只有 `voiceState.enabled=true` 且 `muted=false` 时，服务端才接受音频。
- 帧格式：无头部裸 PCM；16000 Hz、单声道、signed 16-bit little-endian。
- 客户端每 20 ms 发送 320 个采样（640 字节）；单帧最大 8192 字节，每秒最多 96 KB。

### 服务端 → 客户端（文本）

| `type` | 字段 | 说明 |
| --- | --- | --- |
| `welcome` | `id`, `name`, `color`, `soldier`, `respawnMs`, `online`, `voiceRelay`, `focus` | 连接即发送；`soldier` 为当前操控单位；`voiceRelay` 描述全局语音参数；`focus.active: true` 表示已处于只读观战 |
| `joined` | `id`, `name`, `color`, `soldier`, `renamed`, `filtered`, `focus` | 代号、操控单位生效或改名成功；`renamed` 表示主动改名，`filtered` 表示原代号被拦截并分配了安全代号；`focus` 返回当前锁定状态 |
| `soldierAck` | `soldier` | 操控单位已生效 |
| `soldierState` | `id`, `soldier` | 某位在线玩家的操控单位发生变化；客户端据此实时替换远端模型 |
| `nameDenied` | `reason` | `filtered`（敏感词）或 `invalid`（空代号）；改代号失败时原代号不变 |
| `snapshot` | `t`, `online`, `players[]`, `roster[]`, `voice[]`, `boat`, `you` | 10 Hz 状态帧；`players[]` 每项含 `x,y,z,yaw,pitch,hp,moving,sprint,shield,soldier`，`roster[]` 同样包含 `soldier` 与 `focused`，`voice[]` 只包含已开麦玩家，`boat` 为共享撤离船状态，`you` 含 `active` 与 `focusUntil` |
| `boatAck` | `aboard`, `seat`, `pos`, `boat` | 登船或下船确认；登船时含座位，下船时含安全落点 |
| `boatDenied` | `reason` | 船只操作拒绝；`range`、`full`、`helm`、`moving`、`landing`、`notAboard`、`rate`、`helmOnly` 或 `unavailable` |
| `boatState` | `boat` | 船只成员或状态变化；`boat.seats` 固定为四个槽位，空位为 `null` |
| `boatInvite` | `from`, `boat`, `at` | 舵手发起全服集合；`from` 为玩家公开信息，`boat` 含当前坐标与容量 |
| `boatInviteSent` | `boat` | 集合邀请已成功广播给其他在线玩家 |
| `voiceState` | `player{id,name,color,enabled,muted,speaking}` | 开麦、静音、说话状态变化 |
| `chat` | `id`, `mid`, `name`, `color`, `text`, `at`, `persisted` | 全服大字消息；`id` 为发送者玩家 ID，`mid` 为大字记录 ID；`persisted: false` 表示已广播但正在异步重试落盘 |
| `chatDenied` | `reason`, `retryIn` | `rate`、`empty`、`filtered` 或 `focus`；被拒绝的消息不会广播 |
| `chatWarning` | `reason`, `mid` | `reason: "storage"` 表示消息已正常广播，但历史记录暂未落盘并已进入自动重试队列 |
| `kill` | `killer`, `victim`, `at` | 击杀事件。`killer` / `victim` 均包含 `id`、`name`、`color`、`soldier`；`soldier` 为 `male` / `female` / `hound` / `drone`，客户端据此在公屏显示击杀者操控单位 |
| `youDied` | `by`, `replay`, `respawnIn`, `respawnAt` | 自己倒下；`by` 含击杀者 `id`、`name`、`color`、`soldier`，无击杀者时为 `null`；`replay` 为服务端权威死亡回放，无击杀者时为 `null` |
| `damaged` | `amount`, `hp`, `from` | 受到伤害；`from` 含攻击者 `id`、`name`、`color`、`soldier` 与 `pos` |
| `hitConfirm` | `targetId`, `damage`, `hp`, `killed`, `blocked` | 命中确认 |
| `respawned` | `pos`, `yaw`, `protectedUntil` | 复活成功 |
| `respawnWait` | `ms` | 复活等待剩余毫秒 |
| `notice` | `kind`, `name`, `id`, `previous`, `reason` | 加入 / 离开 / 复活 / 改名通知 |
| `shot` | `id`, `origin`, `dir` | 其他玩家射击特效 |
| `focusState` | `active`, `until`, `remainingMs`, `recordId`, `kind`, `durationMs`, `trigger`, `scope`, `playMs`, `ended`, `expired`, `denied`, `spawn` | 专注状态变化。`active: true` 表示进入只读观战；`kind: "manual"` 为 30 分钟手动模式，`kind: "auto"` / `trigger: "continuous_play"` 为连续游玩 4 小时触发的 20 分钟强制模式；`expired: true` 表示对应时长已到期；`ended: true` 表示只读解除并附带新的 `spawn`；`denied: true` 表示锁定期间的操作被拒绝 |
| `pong` | `t` | 延迟响应 |

### 服务端权威死亡回放

服务端以 10 Hz 记录每名在线玩家的权威位置、朝向、俯仰与血量状态，并同时记录 `shot` 的枪口坐标 / 弹道方向以及 `hit` 的伤害结果，仅保存在内存环形缓冲中。发生击杀时，服务端截取击杀前 4500 ms 的双方轨迹与真实射击 / 命中事件，随 `youDied.replay` 只下发给被击杀者；客户端不再使用本地快照拼接或伪造轨迹。

- `replay.version`：固定为 `1`
- `replay.source`：固定为 `server`
- `replay.id`：回放记录 ID
- `replay.killAt`：服务端击杀时间戳（毫秒）
- `replay.windowMs`：回放窗口，默认 `4500`
- `replay.victim` / `replay.killer`：双方玩家的 `id`、`name`、`color`、`soldier`
- `replay.distance` / `replay.bearing`：服务端计算的击杀距离（米）与方位角（度）
- `replay.victimTrack` / `replay.killerTrack`：紧凑轨迹数组，每项为 `[dt, x, y, z, yaw, pitch]`；`dt` 是相对 `killAt` 的毫秒偏移（负数表示击杀前）
- `replay.shots`：击杀者在窗口内的真实射击，每项为 `[dt, originX, originY, originZ, dirX, dirY, dirZ]`
- `replay.hits`：被击杀者在窗口内收到的伤害，每项为 `[dt, damage, hpAfter, killed, attackerId]`

客户端仅在 `replay.source === "server"` 且轨迹有效时播放 3D 回放；缺少服务端回放数据时显示“3D 回放不可用”，不会用本地缓存伪造回放。

### 服务端 → 客户端（二进制）

玩家开麦并发送音频后，服务端把同一帧中继给**除发送者以外的所有在线玩家**，不要求接收方开麦。

- 帧头：5 字节。第 1 字节固定为 `0x56`（`V`），第 2–5 字节为 little-endian `uint32` 发送者数字 ID。
- 帧体：原始 PCM；16000 Hz、单声道、signed 16-bit little-endian。
- 示例：发送者 `p12` 的帧头为 `56 0C 00 00 00`，其后紧跟 PCM 数据。
- 收听端按发送者 ID 分轨缓冲播放；可静音全部语音，也可点击玩家单独静音。
- 服务端不保存、不落盘语音数据。

### 语音流程

```text
玩家 A → /ws {"type":"voiceState","enabled":true,"muted":false}
玩家 A → /ws <binary PCM 640 bytes>（每 20 ms）
服务端 → 玩家 B /ws <binary header + PCM>
服务端 → 玩家 C /ws <binary header + PCM>
玩家 B（未开麦）→ Web Audio 播放
玩家 B → 点击静音 → 本地停止播放，不影响其他玩家
玩家 A → {"type":"voiceState","enabled":true,"muted":true}
服务端 → 停止转发 A 的音频
```

## 错误响应

- 未知 API：`404`，`{"ok":false,"message":"接口不存在"}`
- 非法请求体：`400`，`{"ok":false,"message":"请求格式不正确"}`
- 服务端异常：`500`，`{"ok":false,"message":"服务器暂时不可用，请稍后重试"}`
- WebSocket 非法 JSON / 未知 `type`：静默丢弃
- WebSocket 非法音频帧：静默丢弃
