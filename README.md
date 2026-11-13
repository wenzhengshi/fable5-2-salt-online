# 盐线行动 · Saltline

一款运行在浏览器中的多人在线 3D 港口枪战游戏。所有进入战场的玩家互为敌人，被击倒后等待 5 秒即可重新加入对战。

项目基于 Node.js、Express、WebSocket 与 Three.js 构建，无需数据库。排行榜保存在本地 `data/` 目录中。

## 版本差异

当前版本为 **v1.27.0**，相对上一版的主要变化：

- 彻底移除 Canvas 2D 战术兼容模式，不再提供俯视二维玩法或自动降级入口。
- 页面、样式、专注模式适配与服务端协议统一为 WebGL 单渲染路径。
- `engine` 仅接受 `webgl`，旧 2D 客户端不再获得专属移动速度上限。
- 版本号、静态资产缓存版本、`API.md` 与验收检查同步更新。

完整的逐项差异、兼容性影响和验收重点见 [CHANGELOG.md](./CHANGELOG.md)。

> **来源与授权声明**
>
> 本项目的原始作品是 [Felix Rieseberg 发布的 Claude Artifact](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)，由作者以 Fable 5.2 单次提示生成并公开展示。
>
> 当前仓库由维护者整理并增加多人联机能力，**不是** Felix Rieseberg 或 Anthropic 的官方仓库，也未获得其官方背书。原作品及原平台内容遵循其自身条款；本仓库的 MIT License 仅适用于维护者有权授权的新增与整理内容。

## 在线游玩

无需下载或安装，使用支持 WebGL 的现代浏览器直接进入：

[立即进入盐线行动在线版 →](https://web-jjuuxm.tulingai.com/)

## 微信交流群

扫码加入 **Saltline-多人联机交流群**，交流玩法、联机部署和代码问题：

<p align="center">
  <img src="docs/media/wechat-group-saltline.jpg" width="360" alt="Saltline-多人联机交流群微信二维码">
</p>

> 当前群二维码在 2026 年 11 月 19 日前有效；二维码更新后请同步替换本图片。

## Android 客户端

[下载盐线行动 Android v1.0 APK](https://github.com/wenzhengshi/fable5-2-salt-online/releases/download/android-v1.0/saltline-android-v1.0.apk)

- 支持 Android 5.0 及以上版本
- APK 大小约 5.16 MiB
- 首次启动需要联网，应用会加载当前在线版游戏
- SHA-256：`e30974084caff7801c38808dd6212fee1b4e917c33a00ee555186e576a1c1bbe`

> 当前 Android v1.0 APK 构建早于在线语音功能，不包含麦克风权限。需要使用语音时，请进入浏览器在线版；后续需重新构建 Android 客户端。

版本说明与后续构建见 [Android v1.0 发布页](https://github.com/wenzhengshi/fable5-2-salt-online/releases/tag/android-v1.0)。

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
- 服务端权威模拟：客户端只上报输入意图，移动碰撞、射击、伤害、击杀与复活均由服务端裁决
- 客户端本地预测、快照插值与软校正，减少延迟感并自动收敛到服务端位置
- 增量快照、视野裁剪（AOI）与随在线人数自适应的广播频率
- 射线遮挡、距离衰减、射速冷却与输入限频校验，异常行为分级警告、锁定或踢出
- 生命值、击杀与战绩统计
- 实时玩家位置、射击表现和击杀信息
- 公屏击杀通知与个人死亡卡片显示击杀者操控单位（男/女士兵、机器狗、无人机）
- 在线人数、战场名单与排行榜
- 服务端 PCM 在线语音中继，支持全服收听、单独静音与 `M` 键开麦 / 关麦
- 全服大字广播与快捷喊话，支持 `T` 键打开和历史记录分页
- 玩家代号、聊天与历史排行榜内容安全过滤
- 支持对简体/繁体、拆字、全角、零宽字符、符号替代和常见同形字规避的识别
- 设置内提供手动专注模式：服务端强制只读 30 分钟，期间只能自动跟随观战实时战局
- 连续实际战斗满 4 小时自动强制专注 20 分钟，期间同样只能观战，计时与锁定均由服务端执行
- 设置内实时显示连续游玩进度，并在剩余 5 分钟、1 分钟时提前提醒；倒计时按服务端时间校准
- 专注记录持久化本机标识、浏览器指纹与 IP，刷新或重连后锁定仍然生效
- 支持男女士兵、机器狗和无人机四类操控单位
- 机器狗复用港口猎犬模型，无人机复用港口海鸥无人机模型，均拥有完整开火、语音、通讯、受击与复活权限
- 无人机按 `Space` 上升、`Shift` 下降，可在空中侦察和交战
- 仅提供 WebGL2 / Three.js 三维战场，不再包含二维俯视兼容模式
- 中英文界面切换
- 桌面端与移动端响应式布局

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本
- 支持 WebSocket 与 WebGL2 的现代浏览器
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
├── services/                # 内容安全过滤等服务
├── views/                   # EJS 页面模板
├── API.md                   # HTTP 与 WebSocket 接口文档
├── CHANGELOG.md             # 版本差异、兼容性与验收记录
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

排行榜写入 `data/leaderboard.json`，全服大字历史追加写入 `data/chat-history.jsonl`，专注记录写入 `data/focus-records.json`，连续游玩计时写入 `data/play-sessions.json`。系统会优先使用 `JICREATE_DATA_DIR`，其次使用 `DATA_DIR`，均未设置时回退到项目内 `data/`。写盘暂时失败时，大字仍会正常广播，并进入自动重试队列；连续游玩计时和强制专注也会先在内存生效。`data/` 下的运行数据默认不进入 Git；容器部署若需要跨重启保留数据，请挂载持久化目录。

## 接口文档

HTTP API、WebSocket 协议、限流规则和消息示例见 [API.md](./API.md)。

## 第三方组件

服务端依赖及其版本见 `package-lock.json`。客户端包含打包后的 Three.js 与其他运行时代码，第三方组件分别遵循其原始许可证。发布或再分发时请同时保留相应许可声明。

## 许可证

本项目原创源码采用 [MIT License](./LICENSE) 开源。
