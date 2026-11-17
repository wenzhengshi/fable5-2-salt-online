# 盐线行动 API 文档

## 概览

- 运行方式：`npm install --omit=dev` 后执行 `npm start`（等价 `node index.js`）
- 运行环境：Node.js 18+，CommonJS
- 监听地址：从环境变量 `PORT` / `HOST` 读取
- 页面地址：`http://$HOST:$PORT/`
- 实时通信：同端口 WebSocket，玩家路径 `/ws`
- 数据格式：WebSocket 文本帧为 JSON；玩家语音为二进制 PCM 帧
- 国际化：`lang` cookie，可选 `zh-CN` / `en-US`；接口提示文案随语言变化
- 持久化目录：优先使用托管平台注入的 `JICREATE_DATA_DIR`，其次 `DATA_DIR`，本地开发回退到项目内 `data/`。排行榜写入 `data/leaderboard.json`，大字历史追加写入 `data/chat-history.jsonl`，专注记录写入 `data/focus-records.json`，后台上传的群聊二维码（base64）写入 `data/group-qr.json`，统一由 `config/storage.js` 原子读写。项目内 `data/` 会自动调整为 `2777` 目录权限，数据文件为 `0664`，避免临时托管重复测试时因跨服务账号无法清理运行数据而还原失败；外部 `JICREATE_DATA_DIR` 不改权。
- 落盘策略：正常时同步追加并 `fsync` 后再广播；若部署目录暂时不可写，大字仍会立即广播，同时进入进程内重试队列，每 4 秒自动重试并通过 `chatWarning` 提醒发送者。历史接口会返回尚未落盘的 `pending` 记录。进程收到 `SIGTERM` / `SIGINT` 时会最后重试一次并同步排行榜与大字文件。
- API 缓存：`/api/*` 统一返回 `Cache-Control: no-store`，避免历史分页被浏览器或代理缓存成空列表。
- 内容安全：玩家代号与全服大字在服务端统一做敏感词过滤；拆字、全角、零宽字符、符号替代与常见同形字规避同样会被识别。
- 当前版本：`1.26.9`，仅保留 WebGL2 + Three.js 三维渲染；客户端会先在实际游戏画布上异步重试并预热 WebGL2 上下文，再加载游戏 bundle，成功上下文由 Three.js 主渲染器直接复用。渲染器、单位预览与死亡回放继续优先请求 `high-performance`，上下文创建失败时按兼容属性回退。画质提供五档：极低档将内部渲染比例降至 50%、手机 DPR 上限设为 1，并关闭阴影、泛光、体积光、环境光遮蔽和平面反射；低内存、少核心或小屏手机会自动进入极低档，动态降档链路也会从低档继续降至极低档。远端玩家操控的机器狗与无人机稳定复用游戏内骨骼单位模型，模型模块晚于首个快照加载时也会自动升级，不再永久回退为方块模型。撤离船升级为任务前置可用的四人多人载具，服务端同步船位、舵手、乘客、坐标、朝向和速度；外海新增带碰撞与复活点的交战平台。青云宗的三座传送门位于入口东西两侧草坡与正前方石阶平台，距落点约 31–32 米，并显示实时方位与距离；从传送门地图返回时会落在对应门户旁。路牌创建由服务端按身份、浏览器指纹与网络来源执行每日额度、短时冷却、突发限流、单地图容量和区域密度限制；拔除操作会在客户端即时移除牌面，并以服务端确认和列表重拉兜底，迟到的旧列表不会把已拔除路牌重新加回。死亡回放仍由服务端以 10 Hz 录制双方真实轨迹、枪口弹道与命中事件，再通过 `youDied.replay` 下发给被击杀者。复活时若聊天面板打开或输入框聚焦，客户端会保留输入内容、光标位置与面板状态，不再自动请求鼠标锁定；指针锁定事件也不会抢走聊天输入焦点。专注模式开始与结束时，服务端会向全服公屏写入结构化系统播报并广播，实时名单显示“专注”徽章；在线玩家接口和 10 Hz 快照同时返回 `focused` 与 `focus` 详情，便于观战者和其他客户端识别专注玩家。专注观战层支持用上一位 / 下一位按钮、玩家列表和键盘方向键切换目标，手动锁定后保持视角，目标离开时回退自动轮播；该切换完全由客户端基于现有快照完成，不新增 WebSocket 消息。本地回放通过 WebAudio 分流同时录制游戏音效，音轨仅进入本机 `MediaRecorder`，不读取麦克风、不上传服务器；客户端会通过 UA 与微信 JS Bridge 自动识别微信内置浏览器，在回放面板显示下载限制提示、录制前二次确认，并拦截微信内下载，引导玩家改在系统浏览器中录制。录制提醒与删除回放均使用 `public/js/modal.js` 提供的自定义模态框，不再调用浏览器原生 `confirm`。群聊二维码可由管理员在后台上传并持久保存，游戏内标题页、暂停菜单与士兵选择页的入口统一读取当前二维码，客户端在打开弹窗或切回标签页时会重新校验版本；版本号统一从 `package.json` 读取，发布前可运行 `npm run release:check` 检查托管完整性。

## 页面

### 首页（游戏）

- 方法：`GET`
- 路径：`/`
- 参数：可选 `?lang=zh-CN` 或 `?lang=en-US`，会同步写入 `lang` cookie
- 安卓应用市场：标题页与暂停菜单提供 `https://tulingai.com/app-market.html?id=49` 下载入口，支持中英文文案并在新标签页打开。
- 飞行碰撞：无人机及飞行单位使用 `flight-collision.js` 对场景实体进行三维碰撞解析；大型货船船壳、上层建筑和艉部结构均会阻挡横向移动、上升与下降。
- 服务端旧客户端约束：`services/playerAuthority.js` 会强制夹紧无人机空气墙、限制 30 发弹夹与空弹换弹，并把每发已确认射击限制为一次命中信用。
- 无人机空气墙：无人机水平位置限制为旧版 `x=-40…40、z=-30…30`，步兵、撤离船和外海交战区不受影响。
- 输入可见性：聊天输入框或输入面板打开时，玩家保持在线可见，不因游戏暂停而从其他客户端消失。
- 空中换兵：无人机在空中切换操作单位时先保存选择，再立即在随机地面点位复活。
- 无限弹药：启用后备弹保持无限，但弹夹仍正常消耗，打空后必须等待自动或手动换弹。
- 说明：多人 3D 港口枪战首页。玩家可直接部署，并通过“设置 → 操控单位”在男女士兵、机器狗、无人机和方块人之间切换；未主动选择时默认方块人。方块人沿用男士兵的移动、命中、伤害与复活参数。其他玩家看到的机器狗与无人机直接复用游戏内的骨骼单位模型；若首个快照早于模型模块加载，客户端会持续等待并自动替换临时兜底。页面提供社区二维码、1–6 连杀播报、含游戏音效的本地录制回放和 Three.js 三维死亡回放；本地回放通过 `audio-tap.js` 将游戏 WebAudio 主输出分流到录制流，视频与音轨均只保存在浏览器 IndexedDB，不读取麦克风。死亡回放使用服务端录制的双方权威轨迹与真实射击、命中事件重建港口集装箱、吊机、灯塔和击杀过程，并提供追踪镜头与播放进度。无人机近地搜索灯与机械单位坠毁均为客户端表现。游戏仅使用 WebGL2 + Three.js 三维渲染，不提供 Canvas 2D 兼容模式，也不再识别 `?gfx=2d` / `?render=2d`；WebGL2 不可用时显示启动错误。移动、命中、快照、限频、反作弊、语音、专注锁定和复活继续使用 v1.23.0 算法。游戏内标题页、暂停菜单与战场名单面板均提供 GitHub 仓库链接 `https://github.com/wenzhengshi/fable5-2-salt-online`。
- 缓存：`Cache-Control: no-store`

### 静态资源

- 方法：`GET`
- 路径：`/css/*`、`/js/*`、`/models/*`
- 说明：游戏样式、Three.js 游戏 bundle、`audio-tap.js` WebAudio 分流、多人对战、`sail.js` 多人撤离船与外海交战区、`death-replay-3d.js` 三维死亡回放、全服开麦语音与大字客户端脚本、男女士兵 GLB 模型、PAC-9 步枪模型，以及机器狗/无人机单位模型脚本。机器狗和无人机直接复用游戏 bundle 内的 `hound` / `gull` 敌人建模与材质；死亡回放和船只系统复用游戏 bundle 暴露的 Three.js，不新增服务端依赖或模型请求。

## 管理后台

管理后台使用独立的管理员会话 Cookie `salt_backup_admin`、CSRF 校验和 60 分钟会话有效期；所有页面返回 `Cache-Control: no-store` 与 `X-Robots-Tag: noindex, nofollow`。页面右上角提供中英文切换表单，提交到 `POST /api/lang` 后以 `303` 返回当前后台页面。

### 后台首页与登录

- `GET /admin`：未登录时显示管理员登录页；首次登录显示修改默认密码页；已登录显示全服备份页。
- `POST /admin/login`：表单字段 `username`、`password`。成功返回 `303 /admin` 并写入管理员会话；凭据错误返回 `401`，登录尝试过多返回 `429`。
- `POST /admin/logout`：表单字段 `csrf`；清除管理员会话并返回 `303 /admin`。

### 修改管理员密码

- `GET /admin/password`：已登录时显示修改密码表单。
- `POST /admin/password`：表单字段 `csrf`、`current`、`password`、`confirm`。新密码至少 12 个字符，不能等于默认密码或当前密码；成功后清空所有管理员会话并返回登录页。

### 路牌审核

- `GET /admin/signs`：需要管理员会话且已完成首次密码修改；支持 `?page=<n>` 分页，列出各地图路牌及其坐标、归属状态。
- `POST /admin/signs/:id/flag`：表单字段 `csrf`、`page`。将指定路牌标记为违规并返回 `303 /admin/signs?page=<n>...`；游戏中牌面文字会替换为违规提示。

### 全服备份

- `POST /admin/backup`：表单字段 `csrf`。先刷新排行榜、路牌、聊天、专注与游玩时长等持久化数据，再生成 ZIP 下载；同一时间仅允许一份备份任务。失败时返回后台错误页。

### 群聊二维码管理

- `GET /admin/qr`：需要管理员会话且已完成首次密码修改；显示当前二维码预览、来源、文件名、大小与更新时间，并提供上传和恢复默认表单。
- `POST /admin/qr`：`multipart/form-data`，字段 `csrf`、`image`。仅接受 PNG / JPG / WebP / GIF（按文件头识别），单文件最大 4 MB；上传成功返回后台二维码管理页并显示成功提示。缺少文件、类型不符或超限返回 `400`，CSRF 失效返回 `403`，存储失败返回 `500`。
- `POST /admin/qr/reset`：表单字段 `csrf`；清空上传的二维码，恢复使用内置 `/img/saltline-wechat-group.svg`。
- 上传的图片以 base64 存入 `data/group-qr.json`，由 `config/storage.js` 原子写入并加锁；托管环境把 `data/` 固定在版本目录之外，因此升级源码与重启服务不会丢失二维码。

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
  - `focusMode.enforcement`：`server`，表示操作锁定由服务端强制执行
  - `focusMode.autoSpectate`：是否自动切换观战视角
  - `focusMode.publicAnnouncements`：开始 / 结束专注时是否向公屏广播系统消息
  - `focusMode.rosterField`：实时名单中标识专注玩家的字段，当前为 `focused`
  - `focusMode.storage`：专注记录持久化文件 `focus-records.json`
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
  - `controls`：本地化操作列表；包含移动、观察、射击、瞄准、换弹、交互、跳跃、冲刺、近战、语音、大字、立路牌、拔路牌、名单与暂停
- 返回示例：`{"ok":true,"version":"1.26.8","engine":"WebGL2 / Three.js (bundled)","rendering":{"mode":"3d","primary":"webgl2","modes":["webgl2"],"fallback":null,"autoFallback":false,"requiresWebGL2":true,"coldStartRecovery":true,"contextReuse":true,"maxContextAttempts":8},"mode":"free-for-all","respawnSeconds":5,"characters":[{"id":"male","name":"男士兵","role":"重装突击手"},{"id":"female","name":"女士兵","role":"先锋侦察兵"},{"id":"hound","name":"机器狗","role":"四足突击平台"},{"id":"drone","name":"无人机","role":"空中侦察平台"},{"id":"classic","name":"方块人","role":"怀旧方块兵"}],"features":{"localReplay":true,"localReplayAudio":true,"deathReplay":true,"deathReplay3d":true,"deathReplayAuthoritative":true,"deathReplayRateHz":10,"deathReplayWindowMs":4500,"multiplayerBoat":true,"boatSeats":4,"boatMissionRequired":false,"externalCombatZone":true,"flightCollision":true,"droneAirWall":true,"typingVisibility":true,"airborneUnitSwitchRespawn":true,"infiniteAmmoRequiresReload":true,"serverAuthorityLegacyGuards":true,"compactMobileType":true},"websocket":"/ws","moderation":{"enabled":true,"names":true,"chat":true,"evasionResistant":true},"focusMode":{"durationMinutes":30,"manualDurationMinutes":30,"enforcement":"server","autoSpectate":true,"publicAnnouncements":true,"rosterField":"focused","storage":"focus-records.json","records":["clientId","fingerprint","ip"]},"comms":{"voice":"server-pcm-relay","sampleRate":16000,"frameMs":20,"globalAudience":true,"listenerMicRequired":false,"chatHistory":{"endpoint":"/api/game/chat/history","persisted":true,"storage":"data/chat-history.jsonl","dataDir":"/srv/runtime-data/data","dataSource":"JICREATE_DATA_DIR","records":42,"pending":0}},"controls":[{"keys":"WASD","label":"移动"}]}`

### 排行榜与在线列表

- 方法：`GET`
- 路径：`/api/game/leaderboard`
- 参数：可选 `?limit=1..100`，默认 `20`
- 返回字段：`online`、`respawnSeconds`、`players[]`、`leaderboard[]`
- `players[]` 每项含 `focused`、`focusUntil`、`focusKind` 与 `focus`；`focus.active: true` 表示该玩家正在专注观战，`focus.kind` 为 `manual` 或 `auto`，并含剩余毫秒与时长。
- 说明：战绩在击杀 / 死亡时累加，并异步写回 `data/leaderboard.json`（保留前 300 条）。命中敏感词的历史代号会被过滤，不会出现在在线列表或排行榜中。

### 大字历史分页

- 方法：`GET`
- 路径：`/api/game/chat/history`
- 参数：
  - `limit`：可选，每页条数，默认 `20`，范围 `1..50`
  - `before`：可选，上一页返回的 `nextCursor`；不传时返回最新一页
- 返回字段：`persisted`、`storage`、`dataDir`、`dataSource`、`pending`、`messages[]`、`nextCursor`、`hasMore`、`total`、`limit`
- `messages[]` 按新到旧排列，每项含 `id`（大字记录 ID）、`kind`、`playerId`、`name`、`color`、`text`、`at`、`pending`。普通大字 `kind: "chat"`；专注系统播报 `kind: "system"`，并返回 `event`（`focusStart` / `focusEnd`）、`targetName`、`focusKind` 与 `durationMs`，客户端按当前语言渲染文案。`pending: true` 表示该消息已广播但仍在等待重试落盘。
- 说明：记录来自 `data/chat-history.jsonl`，读取时会对比文件大小与修改时间，确保服务重启或外部写入后仍以磁盘内容为准；前端滚动到列表底部时携带 `before` 自动加载更早一页。命中敏感词或损坏的记录会被忽略。
- 返回示例：`{"ok":true,"lang":"zh-CN","persisted":true,"storage":"data/chat-history.jsonl","dataDir":"/srv/runtime-data/data","dataSource":"JICREATE_DATA_DIR","pending":0,"messages":[{"id":"c12","playerId":"p3","name":"RAVEN-42","color":"#ffb347","text":"跟我推进！","at":1794500000000,"pending":false}],"nextCursor":"c12","hasMore":true,"total":48,"limit":20}`

### 问候接口

- 方法：`GET`
- 路径：`/api/hello`
- 返回示例：`{"message":"你好，世界！"}`

### 手动专注状态

- 方法：`GET`
- 路径：`/api/focus/status`
- 参数：`clientId`（浏览器持久化标识）、`fingerprint`（浏览器指纹摘要），至少提供一个
- 返回字段：`focus.active`、`focus.durationMs`、`focus.manualDurationMs`、`focus.record`
- `focus.record` 仅在手动锁定生效时返回，包含记录 ID、脱敏标识、起止时间和剩余时间。页面刷新或 WebSocket 重连后，已开启的手动专注仍然有效。

### 开启手动专注模式

- 方法：`POST`
- 路径：`/api/focus/start`
- Body：`{"clientId":"c_...","fingerprint":"fp1-..."}`
- 说明：固定手动锁定 30 分钟，不接受客户端指定更短时长；已存在有效记录时复用原到期时间，不会因重复提交延长。服务端会同步锁定该 `clientId` / `fingerprint` 对应的在线 WebSocket 会话，并记录请求 IP；首次进入专注时向全服公屏广播系统消息，重复提交不会重复播报。自动强制专注由服务端内部创建，不通过此接口触发，但同样会播报。
- 返回字段：`focus.active`、`focus.record`、`reused`、`persisted`（审计记录是否已落盘）、`sessions`（本次同步锁定的在线会话数）
- 状态码：首次创建 `201`；已有有效记录 `200`
- 容错说明：托管数据目录或文件锁暂时不可写时，服务端仍会立即建立内存锁定并返回成功，`persisted` 为 `false`；记录会每 4 秒自动重试原子写入，进程收到 `SIGTERM` / `SIGINT` 时也会再次补写。单次 WebSocket 会话同步异常同样不会改变成功状态码。
- 返回示例：`{"ok":true,"now":1794500000000,"reused":false,"persisted":true,"sessions":1,"focus":{"active":true,"durationMs":1800000,"record":{"id":"focus_m7x2_a1b2c3d4","clientId":"c_...","fingerprint":"fp1-ab…9f2c","ip":"203.0.*.*","startedAt":1794500000000,"expiresAt":1794501800000,"durationMs":1800000,"remainingMs":1800000,"kind":"manual","trigger":"manual","playMs":0,"active":true}},"message":"手动专注模式已开启，30 分钟内只能观战"}`

### 查询玩家群聊二维码

- 方法：`GET`
- 路径：`/api/community/qr`
- 说明：返回当前二维码的来源与元信息，不返回图片二进制；首页会在渲染时把同样的数据注入 `window.__SALT_I18N__.groupQr`，游戏内入口据此请求图片。
- 返回字段：`ok`、`qr.custom`（是否使用后台上传图片）、`qr.url`（图片地址）、`qr.api`、`qr.defaultUrl`、`qr.version`、`qr.fileName`、`qr.mimeType`、`qr.bytes`、`qr.updatedAt`
- 返回示例：`{"ok":true,"qr":{"custom":false,"url":"/img/saltline-wechat-group.svg","api":"/api/community/qr/image","defaultUrl":"/img/saltline-wechat-group.svg","version":"default","fileName":"saltline-wechat-group.svg","mimeType":"image/svg+xml","bytes":0,"updatedAt":""}}`

### 获取玩家群聊二维码图片

- 方法：`GET`
- 路径：`/api/community/qr/image`（支持可选 `?v=<version>` 用于刷新缓存）
- 说明：后台上传过图片时返回该图片的原始字节与对应 `Content-Type`；未上传时返回内置 SVG。响应继承 `/api/*` 的 `no-store` 缓存策略。
- 状态码：`200`

### 切换语言

- 方法：`POST`
- 路径：`/api/lang`
- Body：JSON `{"lang":"zh-CN"}` / `{"lang":"en-US"}`，或后台语言表单的 `application/x-www-form-urlencoded` 字段 `lang`、`redirect`
- 说明：写入有效期一年的 `lang` cookie；非法值回退为 `zh-CN`。JSON 请求返回当前语言的确认消息；表单请求可在 `redirect` 为站内绝对路径时返回 `303` 重定向，供无脚本后台页切换语言。

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
| `state` | `pos`, `yaw`, `pitch`, `active`, `visible`, `moving`, `sprint` | 10 Hz 位置与动作状态；仅同步移动与冲刺，蹲伏和趴下已移除。 |
| `shot` | `origin`, `dir` | 射击特效广播 |
| `hit` | `targetId` | 命中判定，服务端校验距离与保护状态 |
| `died` | 无 | 主动上报死亡 |
| `respawn` | 无 | 请求复活；死亡后至少等待 5 秒 |
| `boatBoard` | `seat?` | 请求登上撤离船；`seat: 0` 表示接管舵位，省略时选择首个空位。仅允许存活、未专注且距离船 8 米内的玩家；驾驶资格无需先完成任务 |
| `boatLeave` | 无 | 请求下船；仅允许船速低于 2.4 米/秒，且船位于撤离码头或外海平台附近 |
| `boatPose` | `pos`, `heading`, `speed` | 舵手以不超过 20 Hz 的频率同步船只坐标、朝向和速度；服务端校验舵手身份、单步位移和海面半径 |
| `boatInvite` | 无 | 舵手向全服发送船只集合广播，冷却 2200 ms |
| `sedanBoard` | 无 | 请求登上共享轿车；仅允许存活、未上船、未处于专注模式且靠近轿车的玩家，车内满员或车速超过 1.5 米/秒时会拒绝 |
| `sedanLeave` | `index` | 任意乘客请求从指定车门下车；车速不得超过 1.5 米/秒，`index` 为服务端确认的安全落点序号 |
| `sedanPose` | `revision`, `pose{x,y,z,heading,speed}` | 驾驶席约每 85 ms 同步一次轿车坐标、朝向与速度；服务端最小接收间隔 45 ms，并校验驾驶资格、地图边界、最高 15 米/秒以及单帧位移 |
| `sedanPortal` | `revision`, `destination` | 轿车进入传送门后请求跨地图行驶；服务端校验车门位置、目标地图与 1800 ms 冷却后广播 `sedanTravel` |
| `sedanReady` | `revision` | 乘客完成目标地图加载后由驾驶席确认，服务端恢复接收 `sedanPose` |
| `qingyunEnter` | 无 | 请求穿过港口时空隧道进入青云宗；仅允许存活、未上船且未处于青云宗或传送门地图的玩家在隧道口附近发送 |
| `qingyunReturn` | 无 | 请求从青云宗返回港口；仅允许存活玩家在任一回港门附近发送 |
| `qingyunLeave` | 无 | 部署或重连流程用于清理青云状态，并把玩家放回出生点 |
| `mapEnter` | `map` | 从青云宗枢纽进入传送门地图；`map` 为 `bayhaven`、`dustfall` 或 `mothlight`。仅允许存活、未上船、当前位于青云宗且靠近对应枢纽门的玩家发送 |
| `mapReturn` | 无 | 从传送门地图返回青云宗；仅允许存活玩家在对应回程门附近发送 |
| `mapLeave` | 无 | 部署或重连流程用于清理地图状态，并把玩家放回其出生点；不要求位于回程门附近 |
| `signList` | 无 | 请求当前地图 52 米内的路牌；同一连接 600 ms 内重复请求会被忽略 |
| `signPlace` | `text`, `style`, `pos` | 在玩家 5 米内的平坦地面创建路牌，文字最多 32 字，颜色为 `blue` 或 `yellow`。服务端强制执行每日 10 块、短时冷却、突发、身份节点、网络来源、地图容量和区域密度限制 |
| `signRemove` | `id` | 拔除自己的路牌；必须位于牌子 5 米内，且北京时间已到次日零点 |
| `focusEnd` | 无 | 手动 30 分钟或自动 20 分钟到期后请求结束只读观战并恢复出生；未到期时返回 `focusState.denied: true` |
| `ping` | `t` | 延迟探测，服务端回 `pong` |

专注锁定期间，`state`、`soldier`、`spawns`、`chat`、`voiceState`、`rename`、`shot`、`hit`、`died`、`respawn`、`boatBoard`、`boatLeave`、`boatPose`、`boatInvite`、`sedanBoard`、`sedanLeave`、`sedanPose`、`sedanPortal`、`sedanReady`、`qingyunEnter`、`qingyunReturn`、`qingyunLeave`、`mapEnter`、`mapReturn`、`mapLeave` 均被服务端拒绝；只允许 `join`、`focusEnd` 与 `ping`。二进制语音帧同样不会转发。

专注观战的切换目标完全在客户端完成：从最新 `snapshot.players` 中筛选同一地图内可见、存活的玩家，支持上一位 / 下一位按钮、目标列表点击与键盘 `ArrowLeft` / `ArrowRight`。切换不会发送新的 WebSocket 消息，也不会改变服务端专注锁定或专注记录；手动目标离开或阵亡后，客户端自动回退到 9 秒轮播。
专注结束时，客户端会恢复进入专注前的战局状态；若从暂停菜单进入，会自动继续行动并同步 HUD、输入和第一人称镜头。即使本地超时兜底先结束观战层，后续到达的 `focusState.ended` 复活点仍会写入本地玩家位置，不需要刷新页面。

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
| `snapshot` | `t`, `online`, `players[]`, `roster[]`, `voice[]`, `boat`, `sedan`, `you` | 10 Hz 状态帧；`players[]` 每项含 `x,y,z,yaw,pitch,hp,moving,sprint,shield,soldier,carSeat`，`roster[]` 每项含 `soldier`、`focused`、`focusUntil`、`focusKind` 与 `focus{active,until,remainingMs,kind,durationMs,trigger}`，`voice[]` 只包含已开麦玩家，`boat` 为共享撤离船状态，`sedan` 为共享轿车状态（含四个座位与当前玩家座位），跨地图玩家为 `null`，`you` 含 `active`、`focusUntil`、`focusKind` 与 `focusDurationMs` |
| `boatAck` | `aboard`, `seat`, `pos`, `boat` | 登船或下船确认；登船时含座位，下船时含安全落点 |
| `boatDenied` | `reason` | 船只操作拒绝；`range`、`full`、`helm`、`moving`、`landing`、`notAboard`、`rate`、`helmOnly` 或 `unavailable` |
| `boatState` | `boat` | 船只成员或状态变化；`boat.seats` 固定为四个槽位，空位为 `null` |
| `boatInvite` | `from`, `boat`, `at` | 舵手发起全服集合；`from` 为玩家公开信息，`boat` 含当前坐标与容量 |
| `boatInviteSent` | `boat` | 集合邀请已成功广播给其他在线玩家 |
| `sedanResult` | `reason`, `position`, `car` | 轿车操作结果；`reason` 为 `board`、`leave`、`full` 或 `moving`，成功下车时 `position` 为安全落点 |
| `sedanTravel` | `car` | 轿车跨地图成功；客户端预载目标地图并按服务端轿车状态重新落位 |
| `qingyunEntered` | `pos` | 已通过服务端校验进入青云宗；`pos` 为服务器指定的落点 |
| `qingyunReturned` | `pos` | 已从青云宗返回港口；`pos` 为港口回程落点 |
| `mapEntered` | `map`, `pos` | 已从青云宗进入传送门地图；`map` 为地图 ID，`pos` 为服务器指定的落点 |
| `mapReturned` | `pos` | 已从传送门地图返回青云宗；`pos` 为青云宗枢纽落点 |
| `signList` | `map`, `signs[]` | 当前地图可见路牌；每项含 `id`、位置、朝向、颜色、牌面文字、提交时间、可拔除时间、本人归属、保护区状态与 `flagged` 违规标记 |
| `signChange` | `map`, `id`, `removed`, `sign` | 路牌新增、更新或拔除通知；`removed: true` 时不带 `sign` |
| `signResult` | `action`, `id`, `reason`, `removed`, `remaining` | 路牌操作结果；`action` 为 `place` 或 `remove`，`id` 为对应路牌 ID。成功放置时 `remaining` 为今日剩余额度；失败原因可为 `cooldown`、`burst`、`daily`、`density`、`ownerLimit`、`networkLimit`、`mapFull`、`occupied`、`gate`、`range`、`text`、`style`、`owner`、`tomorrow`、`identity`、`storage` 或 `busy` |
| `signFlagged` | 无 | 自己创建的路牌被管理员标记为违规，客户端显示牌面已替换提示 |
| `voiceState` | `player{id,name,color,enabled,muted,speaking}` | 开麦、静音、说话状态变化 |
| `chat` | `id`, `mid`, `name`, `color`, `text`, `at`, `persisted` | 普通全服大字；另含专注公屏系统播报：`kind: "system"`、`event: "focusStart" / "focusEnd"`、`targetName`、`focusKind`、`durationMs`。`mid` 为大字记录 ID；`persisted: false` 表示已广播但正在异步重试落盘 |
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
| `focusState` | `active`, `until`, `remainingMs`, `recordId`, `kind`, `durationMs`, `trigger`, `scope`, `playMs`, `ended`, `expired`, `denied`, `spawn` | 专注状态变化。`active: true` 表示进入只读观战，手动开启后持续 30 分钟。 |
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
- `replay.victimTrack` / `replay.killerTrack`：紧凑轨迹数组，每项为 `[dt, x, y, z, yaw, pitch, armor]`；`armor` 的位 1 表示头盔、位 2 表示防弹衣，旧轨迹省略时按 0 处理。`dt` 是相对 `killAt` 的毫秒偏移（负数表示击杀前）
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
