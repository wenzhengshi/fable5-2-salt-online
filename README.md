# 盐线行动 · Saltline

一款运行在浏览器中的多人在线 3D 港口枪战游戏。所有进入战场的玩家互为敌人，被击倒后等待 5 秒即可重新加入对战。

项目基于 Node.js、Express、WebSocket 与 Three.js 构建，无需数据库。排行榜保存在本地 `data/` 目录中。

## v1.25.3 安卓应用市场入口

游戏标题页与暂停菜单新增“安卓应用市场”入口，点击后在新标签页打开盐线行动应用市场下载页。入口支持中英文界面，并沿用现有深色战术风格。手机端同步收紧标题、说明、状态和信息文本字号，所有按钮的尺寸与位置保持不变。静态资源版本同步更新，避免浏览器继续使用旧缓存。

## v1.25.2 本地回放录制游戏音效

本地回放现在同时录制战场画面和游戏音效。新增的 WebAudio 分流层会从游戏主输出复制一份音轨给本机 `MediaRecorder`，枪声、爆炸、载具和背景音乐都会进入回放文件；停止录制不会影响游戏继续发声。音轨优先封装为 MP4/AAC，不支持时自动回退到 WebM/Opus。录像仍只保存在当前浏览器的 IndexedDB，不上传服务器，也不调用麦克风。

## v1.25.1 正式版整理

本版以当前工作区的 `v1.25.0` 为代码基线，并逐文件核对上传的 `v1.24.5` 源码包：上传包内 83 个文件均存在，其中核心游戏资源与当前版本完全一致，其余差异均为后续新增功能与托管修复，因此不回退旧包。版本号现在只维护在 `package.json`，游戏元信息接口与静态资源缓存号会自动同步。

发布前可执行 `npm run release:check`，检查必需文件、CommonJS、Node.js 18+ 启动方式、依赖白名单、双语文案、`PORT` / `HOST` 监听、API 文档及 `data/` 运行数据残留。

## v1.25.0 多人撤离船与外海交战区

撤离船不再绑定任务完成状态。玩家可以在任意时刻靠近撤离点的船，按 `E` 接管舵位或进入乘客位；同一艘船的坐标、朝向、速度和四个座位由服务端同步。舵手可以向全服发送集合邀请，乘客可保留第一人称瞄准与射击能力。

撤离点原有的客户端硬边界已经扩展，海面新增“外海交战区”平台，包含碰撞地面、掩体、登船落点和独立复活点。玩家可以驾船离开港口、在平台下船并对战；在外海死亡后会优先在外海平台复活。船只无人使用一段时间，或全服最后一名玩家离线时，会自动回到撤离码头。

## v1.24.5 渲染策略回退

撤回 v1.24.3 对 WebGL 渲染偏好的调整，恢复原有渲染器与画质探测逻辑：主渲染器、单位预览与死亡回放继续优先请求 `high-performance`，浏览器上下文预热与失败回退保持原样。

## v1.24.4 本地回放重复下载修复

本地回放下载原先同时使用原生 `<a download>` 与点击处理器内的程序化下载，单次点击会触发两次下载，浏览器随后把后续点击当作批量自动下载拦截。v1.24.4 改为单一按钮式下载路径，每次点击生成独立的 Blob URL，并在释放前保留足够时间，同一段录像可以反复下载。

## v1.24.1 远端机器狗真实模型修复

远端玩家操控的机器狗与无人机现在会稳定复用游戏内的骨骼单位模型；即使首个联网快照早于模型模块加载，也会持续等待并自动替换临时兜底，不再出现永久方块狗。

## v1.24.0 服务端权威死亡回放

死亡回放不再由浏览器用本地快照自行拼接。服务端以 10 Hz 记录双方的权威位置、朝向与俯仰，并记录真实射击的枪口位置、弹道方向和命中伤害；击杀发生时截取此前 4.5 秒的完整时间线，随 `youDied.replay` 下发给被击杀者。Three.js 只负责把这份服务端实录重建为三维追踪镜头，双方移动、枪火时刻与命中倒地均来自实际对战数据。游戏继续仅使用 WebGL2 + Three.js 三维渲染。

> **来源与授权声明**
>
> 本项目的原始作品是 [Felix Rieseberg 发布的 Claude Artifact](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)，由作者以 Fable 5.2 单次提示生成并公开展示。
>
> 当前仓库由维护者整理并增加多人联机能力，**不是** Felix Rieseberg 或 Anthropic 的官方仓库，也未获得其官方背书。原作品及原平台内容遵循其自身条款；本仓库的 MIT License 仅适用于维护者有权授权的新增与整理内容。

## 在线游玩

无需下载或安装，使用支持 WebGL 的现代浏览器直接进入：

[立即进入盐线行动在线版 →](https://web-jjuuxm.tulingai.com/)

## Android 客户端

[前往安卓应用市场下载盐线行动](https://tulingai.com/app-market.html?id=49)

[下载盐线行动 Android v1.0 APK（支持应用内连麦）](https://github.com/wenzhengshi/fable5-2-salt-online/releases/download/android-v1.0-voice/saltline-android-v1.0-voice.apk)

- 支持 Android 5.0 及以上版本
- APK 大小约 5.83 MiB
- 首次启动需要联网，应用会加载当前在线版游戏
- 支持应用内连麦，首次使用时需要授予麦克风权限
- 包名：`cn.jicreate.web_jjuuxm.a6b6b281d9f`
- SHA-256：`91a3069646b6f412c892912d774c233bc884c85c0f64cf67e7335b55d1d1dea5`

> 本次构建的包名与旧版 Android v1.0 不同，因此会作为独立应用安装；设备中的旧版客户端不会自动覆盖。

版本说明与后续构建见 [Android v1.0（应用内连麦）发布页](https://github.com/wenzhengshi/fable5-2-salt-online/releases/tag/android-v1.0-voice)。

## 游戏预览

<p align="center">
  <a href="docs/media/multiplayer-demo.mp4">
    <img src="docs/media/multiplayer-demo.gif" width="360" alt="盐线行动多人对战演示">
  </a>
</p>

<p align="center"><sub>多人联机实机演示 · 点击预览图查看视频</sub></p>

| 移动端任务界面 | 移动端多人对战 |
| --- | --- |
| ![移动端任务界面](docs/media/mobile-mission.jpg) | ![移动端多人对战](docs/media/mobile-multiplayer.jpg) |

| 仓库室内场景 | 仓库高台场景 |
| --- | --- |
| ![仓库室内场景](docs/media/warehouse-interior.jpg) | ![仓库高台场景](docs/media/warehouse-catwalk.jpg) |

| 码头交火 | 集装箱通道 |
| --- | --- |
| ![码头交火](docs/media/pier-firefight.jpg) | ![集装箱通道](docs/media/container-yard.jpg) |

更多截图与视频素材位于 [`docs/media/`](docs/media/)。

## 来源说明

本仓库所呈现的浏览器游戏，以 [Felix Rieseberg（@felixrieseberg）](https://x.com/felixrieseberg) 于 2026 年 11 月 10 日在 X 上展示的 **Fable 5.2 单次提示生成游戏实验**为项目源头，并在此基础上补充了 Node.js 服务端、WebSocket 多人联机、5 秒复活、排行榜等功能。

- 原始作品：[Claude Artifact 原链接](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)
- 原作者账号：[Felix Rieseberg（@felixrieseberg）](https://x.com/felixrieseberg)

原帖所述上游实验数据如下，不计本仓库的改造与部署成本：

- 游戏中的模型、声音与纹理均从零生成。
- 按 API 定价计算，本次测试约消耗 550 美元。
- 使用约 270 万输出令牌与 445 万输入令牌，并大量使用了缓存。
- 总耗时约 8 小时。

### 本仓库改造与部署

- 源码整理、多人联机功能改造及其他后续修改使用 `deepseek-flash` 模型完成。
- 在线版本通过 [tulingai.com](https://tulingai.com/) 提供的托管部署工具发布。
- 当前在线入口：[立即进入盐线行动在线版](https://web-jjuuxm.tulingai.com/)。

当前仓库由维护者整理与二次开发，并非 Felix Rieseberg 或 Anthropic 的官方仓库。原始作品链接以 [Claude Artifact 完整地址](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp) 为准。

原帖截图未展示源代码的独立许可证。仓库根目录的 MIT License 仅表示当前维护者对可适用内容作出的授权；再分发或商用前，请核对原作者及原平台的原始条款。

<details>
<summary>查看原帖截图</summary>
<p align="center">
  <img src="docs/media/source-felix-rieseberg.jpg" width="520" alt="Felix Rieseberg 关于 Fable 5.2 游戏实验的原帖截图">
</p>
</details>

## 功能

- 多人在线自由混战（free-for-all）
- 5 秒自动复活与 2 秒复活保护
- 服务端命中校验、生命值、击杀与战绩统计
- 实时玩家位置、射击表现和击杀信息
- 服务端权威死亡回放：10 Hz 记录双方真实轨迹、枪口弹道与命中事件，客户端不再本地伪造
- 公屏击杀通知与个人死亡卡片显示击杀者操控单位（男/女士兵、机器狗、无人机）
- 任务未完成也可驾驶撤离船，支持舵手和三名乘客实时同船
- 船上可瞄准、射击，支持全服集合邀请、座位状态和死亡自动离船
- 撤离点空气墙替换为开放海面与“外海交战区”平台，支持外海步战和对应复活点
- 在线人数、战场名单与排行榜
- 服务端 PCM 在线语音中继，支持全服收听、单独静音与 `M` 键开麦 / 关麦
- 全服大字广播与快捷喊话，支持 `T` 键打开和历史记录分页
- 玩家代号、聊天与历史排行榜内容安全过滤
- 支持对简体/繁体、拆字、全角、零宽字符、符号替代和常见同形字规避的识别
- 设置内提供手动专注模式：服务端强制只读 30 分钟，期间只能自动跟随观战实时战局
- 连续实际战斗满 4 小时自动强制专注 20 分钟，期间同样只能观战，计时与锁定均由服务端执行
- 专注记录持久化本机标识、浏览器指纹与 IP，刷新或重连后锁定仍然生效
- 支持男女士兵、机器狗和无人机四类操控单位
- 机器狗复用港口猎犬模型，无人机复用港口海鸥无人机模型，均拥有完整开火、语音、通讯、受击与复活权限
- 无人机按 `Space` 上升、`Shift` 下降，可在空中侦察和交战
- 仅使用 WebGL2 + Three.js 三维渲染，不再提供 Canvas 2D 战术模式或画质参数降级
- 中英文界面切换
- 桌面端与移动端响应式布局

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本
- 支持 WebSocket 与 WebGL2 的现代浏览器；WebGL2 不可用时不会进入游戏
- 在线语音需要 HTTPS 或 `localhost` 环境，并授予麦克风权限

## 本地运行

```bash
npm install
cp .env.example .env
npm start
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
npm start
```

浏览器访问 `http://localhost:3000`。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 与 WebSocket 共用端口 |
| `HOST` | 代码回退为 `127.0.0.1` | 监听地址；`.env.example` 使用 `0.0.0.0`，便于本地和容器访问 |
| `JICREATE_DATA_DIR` | 未设置 | 托管平台提供的持久化数据目录，优先级最高 |
| `DATA_DIR` | 未设置 | 自定义持久化数据目录；未设置时回退到项目内 `data/` |

`.env` 仅用于本地配置，不会提交到 Git。公开部署时请在平台的环境变量设置中配置实际值。

## 操作

| 操作 | 按键 |
| --- | --- |
| 移动 | `W` `A` `S` `D` |
| 观察 | 鼠标 |
| 射击 | 鼠标左键 |
| 瞄准 | 鼠标右键 |
| 换弹 | `R` |
| 跳跃 | `Space` |
| 冲刺 | `Shift` |
| 登上 / 离开撤离船 | `E` |
| 船只推进 / 倒车 | `W` / `S` |
| 船只左转 / 右转 | `A` / `D` |
| 船只加速 | `Shift` |
| 发出撤离船集合邀请 | 船上右上角“邀请登船” |
| 无人机上升 | `Space` |
| 无人机下降 | `Shift` |
| 开麦 / 关麦 | `M` |
| 发送大字 | `T` |
| 战场名单 | `Tab` |
| 暂停 | `Esc` |

## 项目结构

```text
.
├── config/                  # JSON 数据存储
├── controllers/             # 页面与游戏 API 控制器
├── data/                    # 运行时排行榜数据
├── locales/                 # 中英文文案
├── public/                  # 样式、游戏 bundle 与多人对战客户端
├── realtime/                # WebSocket 实时对战服务
├── routes/                  # HTTP API 路由
├── services/                # 内容安全过滤、死亡回放录制等服务
├── views/                   # EJS 页面模板
├── API.md                   # HTTP 与 WebSocket 接口文档
└── index.js                 # 应用入口
```

## 部署

生产环境可使用任意支持 Node.js 的平台。构建命令不是必需的，启动命令为：

```bash
npm install --omit=dev
npm start
```

平台需要允许 WebSocket 升级请求。HTTP 和 WebSocket 使用同一个 `PORT`。

## 数据持久化

排行榜写入 `data/leaderboard.json`，全服大字历史追加写入 `data/chat-history.jsonl`，专注记录写入 `data/focus-records.json`，连续游玩计时写入 `data/play-sessions.json`。系统会优先使用 `JICREATE_DATA_DIR`，其次使用 `DATA_DIR`，均未设置时回退到项目内 `data/`。项目内 `data/` 使用 `2777` 目录权限、数据文件使用 `0664` 权限，确保临时托管在下一轮还原时可被平台服务账号安全清理；外部持久化目录不强制改权。写盘暂时失败时，大字仍会正常广播，并进入自动重试队列；连续游玩计时和强制专注也会先在内存生效。`data/` 下的运行数据默认不进入 Git；容器部署若需要跨重启保留数据，请挂载持久化目录。

## 接口文档

HTTP API、WebSocket 协议、限流规则和消息示例见 [API.md](./API.md)。

## 第三方组件

服务端依赖及其版本见 `package-lock.json`。客户端包含打包后的 Three.js 与其他运行时代码，第三方组件分别遵循其原始许可证。发布或再分发时请同时保留相应许可声明。

## 许可证

本项目原创源码采用 [MIT License](./LICENSE) 开源。
