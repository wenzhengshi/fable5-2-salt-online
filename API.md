# 盐线行动 API 文档

## 概览

- 运行方式：`npm install --omit=dev` 后执行 `npm start`（等价 `node index.js`）
- 运行环境：Node.js 18+，CommonJS
- 监听地址：从环境变量 `PORT` / `HOST` 读取
- 页面地址：`http://$HOST:$PORT/`
- 实时通信：同端口 WebSocket，玩家路径 `/ws`
- 数据格式：WebSocket 文本帧为 JSON；玩家语音为二进制 PCM 帧
- 国际化：`lang` cookie，可选 `zh-CN` / `en-US`；接口提示文案随语言变化
- 持久化目录：优先使用托管平台注入的 `JICREATE_DATA_DIR`，其次 `DATA_DIR`，本地开发回退到项目内 `data/`。排行榜写入 `data/leaderboard.json`，大字历史追加写入 `data/chat-history.jsonl`，手动专注记录写入 `data/focus-records.json`，统一由 `config/storage.js` 原子读写。
- 落盘策略：正常时同步追加并 `fsync` 后再广播；若部署目录暂时不可写，大字仍会立即广播，同时进入进程内重试队列，每 4 秒自动重试并通过 `chatWarning` 提醒发送者。历史接口会返回尚未落盘的 `pending` 记录。进程收到 `SIGTERM` / `SIGINT` 时会最后重试一次并同步排行榜与大字文件。
- API 缓存：`/api/*` 统一返回 `Cache-Control: no-store`，避免历史分页被浏览器或代理缓存成空列表。
- 内容安全：玩家代号与全服大字在服务端统一做敏感词过滤；拆字、全角、零宽字符、符号替代与常见同形字规避同样会被识别。

## 页面

### 首页（游戏）

- 方法：`GET`
- 路径：`/`
- 参数：可选 `?lang=zh-CN` 或 `?lang=en-US`，会同步写入 `lang` cookie
- 说明：多人 3D 港口枪战首页。玩家可直接部署，并通过“设置 → 操控单位”在男士兵、女士兵、机器狗和无人机之间切换；移动端选择层在手势结束后打开，不会因同一次触摸的后续点击而闪现或误触关闭。设置中还提供“手动专注模式”：开启后服务端强制锁定 30 分钟，期间不能移动、射击、聊天、开麦、改名或复活，只能自动跟随观战在线玩家的实时战局；本机标识、浏览器指纹与 IP 会写入 `data/focus-records.json` 作为限制与审计记录。包含在线人数、战场名单、5 秒复活、全服开麦语音、单独静音与全服大字。大字记录持久保存在服务端，频道内按最新在上排列，滚动到底部会自动加载更早记录。单位选择会写入浏览器本地存储，并通过 WebSocket 同步给所有玩家；服务端接受 `male` / `female` / `hound` / `drone`。机器狗复用港口猎犬模型，无人机复用港口海鸥无人机模型，四类单位均拥有开火、受击、语音、通讯、昵称与复活权限。无人机按 `Space` 上升、`Shift` 下降。自定义士兵模型、持枪行走与冲刺姿态通过 `hunter-avatar.js` 驱动，机器狗和无人机模型由 `unit-models.js` 从现有敌人模型池克隆；蹲伏动作已从输入、角色姿态和同步协议中移除。若浏览器无法创建 WebGL 上下文，页面会自动降级到 Canvas 2D 战术兼容模式；`GET /?gfx=2d` 可手动进入该模式，兼容层复用同一 WebSocket 房间、语音、代号、单位选择、专注锁定与复活协议。游戏内标题页、暂停菜单与战场名单面板均提供 GitHub 仓库链接 `https://github.com/wenzhengshi/fable5-2-salt-online`。
- 缓存：`Cache-Control: no-store`

### 静态资源

- 方法：`GET`
- 路径：`/css/*`、`/js/*`、`/models/*`
- 说明：游戏样式、Three.js 游戏 bundle、多人对战、全服开麦语音与大字客户端脚本、男女士兵 GLB 模型、PAC-9 步枪模型，以及机器狗/无人机单位模型脚本。机器狗和无人机直接复用游戏 bundle 内的 `hound` / `gull` 敌人建模与材质，不新增重复模型资源。

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
  - `characters`：可选操控单位列表，`id` 为 `male` / `female` / `hound` / `drone`，`name` 与 `role` 随语言返回
  - `online`：当前 WebSocket 在线连接数
  - `websocket`：`/ws`
  - `engine`：`WebGL2 / Three.js (bundled) + Canvas 2D fallback`
  - `rendering.primary`：主渲染器 `webgl2`
  - `rendering.fallback`：无 WebGL2 时的自动兼容渲染器 `canvas2d`
  - `rendering.autoFallback`：是否自动切换兼容模式
  - `moderation.enabled`：内容安全过滤是否启用
  - `moderation.names` / `moderation.chat`：代号与大字是否启用过滤
  - `moderation.evasionResistant`：是否启用拆字与同形字规避识别
  - `moderation.categories`：当前过滤类别列表
  - `focusMode.durationMinutes`：手动专注模式固定时长，当前为 `30`
  - `focusMode.enforcement`：`server`，表示操作锁定由服务端强制执行
  - `focusMode.autoSpectate`：是否自动切换观战视角
  - `focusMode.storage`：持久化文件 `focus-records.json`
  - `focusMode.records`：登记字段 `clientId`、`fingerprint`、`ip`
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
- 返回示例：`{"ok":true,"version":"1.22.0","mode":"free-for-all","respawnSeconds":5,"characters":[{"id":"male","name":"男士兵","role":"重装突击手"},{"id":"female","name":"女士兵","role":"先锋侦察兵"},{"id":"hound","name":"机器狗","role":"四足突击平台"},{"id":"drone","name":"无人机","role":"空中侦察平台"}],"websocket":"/ws","moderation":{"enabled":true,"names":true,"chat":true,"evasionResistant":true},"focusMode":{"durationMinutes":30,"enforcement":"server","autoSpectate":true,"storage":"focus-records.json","records":["clientId","fingerprint","ip"]},"comms":{"voice":"server-pcm-relay","sampleRate":16000,"frameMs":20,"globalAudience":true,"listenerMicRequired":false,"chatHistory":{"endpoint":"/api/game/chat/history","persisted":true,"storage":"data/chat-history.jsonl","dataDir":"/srv/runtime-data/data","dataSource":"JICREATE_DATA_DIR","records":42,"pending":0}},"controls":[{"keys":"WASD","label":"移动"}]}`

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

### 手动专注状态

- 方法：`GET`
- 路径：`/api/focus/status`
- 参数：
  - `clientId`：浏览器持久化的本机标识
  - `fingerprint`：浏览器指纹摘要；`clientId` 与 `fingerprint` 至少提供一个
- 返回字段：`focus.active`、`focus.durationMs`、`focus.record`
- `focus.record` 仅在锁定生效时返回，包含 `id`（专注记录 ID）、`clientId`、脱敏后的 `fingerprint` / `ip`、`startedAt`、`expiresAt`、`remainingMs`
- 说明：服务端以 `clientId` 或 `fingerprint` 匹配 30 分钟内的最新记录；页面刷新、WebSocket 重连后仍保持只读锁定
- 返回示例：`{"ok":true,"now":1794500000000,"focus":{"active":true,"durationMs":1800000,"record":{"id":"focus_m7x2_a1b2c3d4","clientId":"c_...","fingerprint":"fp1-ab…9f2c","ip":"203.0.*.*","startedAt":1794500000000,"expiresAt":1794501800000,"remainingMs":1800000,"active":true}}}`

### 开启手动专注模式

- 方法：`POST`
- 路径：`/api/focus/start`
- Body：`{"clientId":"c_...","fingerprint":"fp1-..."}`
- 说明：固定锁定 30 分钟，不接受客户端指定更短时长；已存在有效记录时复用原到期时间，不会因重复提交延长。服务端会同步锁定该 `clientId` / `fingerprint` 对应的在线 WebSocket 会话，并记录请求 IP。
- 返回字段：`focus.active`、`focus.record`、`reused`、`sessions`（本次同步锁定的在线会话数）
- 状态码：首次创建 `201`；已有有效记录 `200`
- 返回示例：`{"ok":true,"now":1794500000000,"reused":false,"sessions":1,"focus":{"active":true,"durationMs":1800000,"record":{"id":"focus_m7x2_a1b2c3d4","clientId":"c_...","fingerprint":"fp1-ab…9f2c","ip":"203.0.*.*","startedAt":1794500000000,"expiresAt":1794501800000,"remainingMs":1800000,"active":true}},"message":"手动专注模式已开启，30 分钟内只能观战"}`

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
- 专注锁定：连接时携带 `clientId` 与 `fingerprint`；若命中有效专注记录，服务端立即把会话设为只读观战，重连后仍生效

### 客户端 → 服务端（文本）

| `type` | 字段 | 说明 |
| --- | --- | --- |
| `join` | `name`, `soldier`, `spawns[]` | 设置代号、操控单位（`male` / `female` / `hound` / `drone`）与可用出生点；非法单位值回退为 `male`。代号命中敏感词时自动分配安全代号，并在 `joined` 中返回 `filtered: true` |
| `soldier` | `soldier` | 游戏过程中切换操控单位；服务端校验后广播 `soldierState`，非法值回退为 `male` |
| `spawns` | `spawns[]` | 更新出生点列表，最多 32 个 |
| `chat` | `text` | 全服大字，最长 80 字，冷却 1200 ms；命中敏感词返回 `chatDenied` 且不广播。通过校验的消息会立即广播并尽力同步写入 `data/chat-history.jsonl`；写盘失败时仍广播，同时进入自动重试队列，并向发送者发送 `chatWarning` |
| `voiceState` | `enabled`, `muted`, `speaking` | 同步麦克风开关、静音、说话状态 |
| `rename` | `name` | 修改代号，最长 16 字；命中敏感词返回 `nameDenied` 并保留原代号 |
| `state` | `pos`, `yaw`, `pitch`, `active`, `moving`, `sprint` | 10 Hz 位置与动作状态；仅同步移动与冲刺，蹲伏和趴下已移除 |
| `shot` | `origin`, `dir` | 射击特效广播 |
| `hit` | `targetId` | 命中判定，服务端校验距离与保护状态 |
| `died` | 无 | 主动上报死亡 |
| `respawn` | 无 | 请求复活；死亡后至少等待 5 秒 |
| `focusEnd` | 无 | 30 分钟到期后请求结束只读观战并恢复出生；未到期时返回 `focusState.denied: true` |
| `ping` | `t` | 延迟探测，服务端回 `pong` |

专注锁定期间，`state`、`soldier`、`spawns`、`chat`、`voiceState`、`rename`、`shot`、`hit`、`died`、`respawn` 均被服务端拒绝；只允许 `join`、`focusEnd` 与 `ping`。二进制语音帧同样不会转发。

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
| `snapshot` | `t`, `online`, `players[]`, `roster[]`, `voice[]`, `you` | 10 Hz 状态帧；`players[]` 每项含 `x,y,z,yaw,pitch,hp,moving,sprint,shield,soldier`，`roster[]` 同样包含 `soldier` 与 `focused`，`voice[]` 只包含已开麦玩家，`you` 含 `active` 与 `focusUntil` |
| `voiceState` | `player{id,name,color,enabled,muted,speaking}` | 开麦、静音、说话状态变化 |
| `chat` | `id`, `mid`, `name`, `color`, `text`, `at`, `persisted` | 全服大字消息；`id` 为发送者玩家 ID，`mid` 为大字记录 ID；`persisted: false` 表示已广播但正在异步重试落盘 |
| `chatDenied` | `reason`, `retryIn` | `rate`、`empty`、`filtered` 或 `focus`；被拒绝的消息不会广播 |
| `chatWarning` | `reason`, `mid` | `reason: "storage"` 表示消息已正常广播，但历史记录暂未落盘并已进入自动重试队列 |
| `kill` | `killer`, `victim`, `at` | 击杀事件。`killer` / `victim` 均包含 `id`、`name`、`color`、`soldier`；`soldier` 为 `male` / `female` / `hound` / `drone`，客户端据此在公屏显示击杀者操控单位 |
| `youDied` | `by`, `respawnIn`, `respawnAt` | 自己倒下；`by` 含击杀者 `id`、`name`、`color`、`soldier`，无击杀者时为 `null` |
| `damaged` | `amount`, `hp`, `from` | 受到伤害；`from` 含攻击者 `id`、`name`、`color`、`soldier` 与 `pos` |
| `hitConfirm` | `targetId`, `damage`, `hp`, `killed`, `blocked` | 命中确认 |
| `respawned` | `pos`, `yaw`, `protectedUntil` | 复活成功 |
| `respawnWait` | `ms` | 复活等待剩余毫秒 |
| `notice` | `kind`, `name`, `id`, `previous`, `reason` | 加入 / 离开 / 复活 / 改名通知 |
| `shot` | `id`, `origin`, `dir` | 其他玩家射击特效 |
| `focusState` | `active`, `until`, `remainingMs`, `recordId`, `scope`, `ended`, `expired`, `denied`, `spawn` | 专注状态变化。`active: true` 表示进入只读观战；`expired: true` 表示 30 分钟已到期；`ended: true` 表示只读解除并附带新的 `spawn`；`denied: true` 表示锁定期间的操作被拒绝 |
| `pong` | `t` | 延迟响应 |

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
