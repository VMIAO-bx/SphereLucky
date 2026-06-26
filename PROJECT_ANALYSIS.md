# Log-Lottery 项目分析文档

> 分析日期：2026-06-13

---

## 一、项目概览

**Log-Lottery** 是一个带 3D 视觉效果的 Web 抽奖系统，版本 `0.6.0-5`，MIT 协议开源。支持桌面端（Tauri）和 Web 端两种部署方式，内置 WebSocket 服务端（Rust 编写）。

---

## 二、项目结构

```
log-lottery-main/
├── index.html                    # 入口 HTML
├── package.json                  # 依赖与脚本
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json                 # TypeScript 配置
├── Dockerfile                    # Docker 部署
├── .github/                      # CI/CD + Issue 模板
├── build/                        # 构建辅助脚本（版本同步）
├── public/                       # 静态资源
├── ws_server/                    # WebSocket 服务端（Rust/Cargo）
├── src-tauri/                    # Tauri 桌面端配置
│
├── src/
│   ├── main.ts                   # 应用入口，挂载 THREE 到全局
│   ├── App.vue                   # 根组件（仅 `<router-view>`）
│   │
│   ├── router/index.ts           # 路由配置
│   ├── store/                    # Pinia 状态管理（5个模块）
│   │   ├── index.ts              # store 聚合入口
│   │   ├── personConfig.ts       # 人员配置
│   │   ├── prizeConfig.ts        # 奖项配置
│   │   ├── globalConfig.ts       # 全局配置（主题/字体/样式）
│   │   ├── serverConfig.ts       # 服务器配置
│   │   └── system.ts             # 系统状态
│   │
│   ├── views/
│   │   ├── Home/                 # ★ 核心：抽奖主页面（3D 引擎在此）
│   │   │   ├── index.vue         # 主页面模板
│   │   │   ├── useViewModel.ts   # ★★★ 核心逻辑：Three.js 初始化/动画/状态机
│   │   │   ├── type.ts           # 状态枚举 (LotteryStatus)
│   │   │   ├── components/
│   │   │   │   ├── HeaderTitle/  # 顶部标题
│   │   │   │   ├── OptionsButton/# 操作按钮组
│   │   │   │   ├── PrizeList/    # 奖项列表（含 GSAP 动画）
│   │   │   │   └── StarsBackground/ # 星空粒子背景（sparticles）
│   │   │   └── utils/
│   │   │       ├── table.ts      # ★ 3D 几何布局算法（表格/球体顶点生成）
│   │   │       ├── random.ts     # 加密安全随机抽取
│   │   │       └── index.ts      # 导出聚合
│   │   ├── Config/               # 配置页面（人员/奖项/全局）
│   │   ├── Demo/                 # 演示页
│   │   └── Mobile/               # 移动端适配
│   │
│   ├── components/               # 通用组件库
│   │   ├── ui/                   # shadcn-vue 风格 UI 组件
│   │   │   ├── button/
│   │   │   ├── dialog/
│   │   │   ├── dropdown-menu/
│   │   │   ├── popover/
│   │   │   ├── command/
│   │   │   ├── sonner/
│   │   │   └── switch/
│   │   ├── FileUpload/
│   │   ├── Loading/
│   │   ├── SvgIcon/
│   │   └── ...
│   │
│   ├── hooks/                    # 组合式函数
│   │   ├── useElement/index.ts   # ★ 卡片样式与中奖位置布局算法
│   │   └── useLocalFonts.ts
│   │
│   ├── constant/                 # 常量配置
│   ├── locales/                  # 国际化 (vue-i18n)
│   ├── utils/                    # 工具函数
│   ├── api/                      # HTTP 接口层
│   └── style/                    # 全局样式 + 3D 卡片样式
```

---

## 三、技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| **框架** | Vue 3.5 + TypeScript 5.9 | 前端主体 |
| **构建** | Vite 7 | 开发与构建 |
| **3D 渲染** | **Three.js 0.166** | 3D 场景核心 |
| **CSS 3D** | **three-css3d 1.0.6** | CSS3D 渲染器（基于 DOM 的 3D 变换） |
| **3D 控制器** | TrackballControls | 鼠标拖拽旋转/缩放场景 |
| **动画** | **@tweenjs/tween.js 23** + **GSAP 3.14** | 补间动画（Tween 驱动 3D 变换，GSAP 驱动 UI 列表动画） |
| **状态管理** | Pinia 3 + pinia-plugin-persist | 全局状态 + localStorage 持久化 |
| **路由** | Vue Router 4 | SPA 路由 |
| **UI 样式** | Tailwind CSS 4 + SCSS + daisyUI 5 | 原子化 CSS + 组件库 |
| **UI 组件** | reka-ui (Radix Vue 继任者) | 无样式可访问 UI 原语 |
| **桌面端** | Tauri 2 | 桌面应用打包 |
| **粒子背景** | sparticles 1.3 | 星空/粒子背景特效 |
| **彩带** | canvas-confetti 1.9 | 中奖后撒花特效 |
| **存储** | localforage + Dexie | IndexedDB 封装 |
| **HTTP** | Axios | API 请求 |
| **WebSocket** | Rust (ws_server) | 多端同步抽奖 |
| **国际化** | vue-i18n | 多语言 |
| **Excel** | xlsx | 导入人员名单 |
| **配色** | vue3-colorpicker | 颜色选择器 |

---

## 四、3D 实现思路（核心详解）

### 4.1 架构概览

```
┌──────────────────────────────────────────────────────┐
│                    浏览器窗口                          │
│  ┌────────────────────────────────────────────────┐  │
│  │           HeaderTitle (2D DOM)                  │  │
│  ├────────────────────────────────────────────────┤  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │          CSS3DRenderer 画布               │  │  │
│  │  │                                          │  │  │
│  │  │   CSS3DObject × N（每张人员卡片 = 1个）    │  │  │
│  │  │   ├── .element-card（DOM div）            │  │  │
│  │  │   ├── 使用 CSS transform: translate3d    │  │  │
│  │  │   └── 内容：工号/姓名/部门/头像            │  │  │
│  │  │                                          │  │  │
│  │  │   Scene（场景）                            │  │  │
│  │  │   Camera（透视相机，FOV=40）               │  │  │
│  │  │   TrackballControls（鼠标交互）            │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  ├────────────────────────────────────────────────┤  │
│  │           OptionButton (2D DOM)                │  │
│  ├────────────────────────────────────────────────┤  │
│  │           PrizeList (2D DOM)                   │  │
│  └────────────────────────────────────────────────┘  │
│  StarsBackground（Canvas 粒子层，z-index 底层）       │
└──────────────────────────────────────────────────────┘
```

### 4.2 核心技术选型：为什么用 CSS3DRenderer 而非 WebGLRenderer？

这是本项目最关键的架构决策：

| 特性 | WebGLRenderer | CSS3DRenderer |
|------|--------------|---------------|
| 渲染对象 | Three.js 几何体 + 材质 | 真实 DOM 元素 |
| 文字渲染 | 需 Canvas 纹理贴图 | 原生 DOM，清晰锐利 |
| 交互 | 需 raycasting | 原生 DOM 事件 |
| 性能 | GPU 加速，适合大量对象 | CPU，适合少量 DOM |
| 样式控制 | 困难 | CSS 全能力 |

**选择 CSS3D 的原因**：每张抽奖卡片需要显示**文字（中文姓名）、头像图片、动态样式变化**，用 WebGL 纹理实现难度极高且文字模糊。CSS3DRenderer 让每个卡片就是一个真实 `<div>`，可以直接应用 CSS 样式、字体、图片、动画。

### 4.3 3D 场景初始化流程

```
initThreeJs()  // useViewModel.ts:80
│
├─ 1. 创建 Scene（场景容器）
│
├─ 2. 创建 PerspectiveCamera（透视相机）
│     fov=40, aspect=width/height, near=1, far=10000
│     初始位置 z=3000
│
├─ 3. 创建 CSS3DRenderer（DOM 3D 渲染器）
│     覆盖整个窗口 90% 高度
│     居中定位，注入 DOM
│
├─ 4. 创建 TrackballControls（轨道球控制）
│     rotateSpeed=1, 最小距离500, 最大距离6000
│     监听 change 事件触发 render()
│
├─ 5. 创建卡片对象循环
│     for each 人员 in tableData:
│       ├─ 创建 div.element-card DOM 树
│       │   ├─ .card-id      → 工号
│       │   ├─ .card-name    → 姓名
│       │   ├─ .card-detail  → 部门/身份
│       │   └─ img.card-avatar → 头像（可选模式）
│       ├─ useElementStyle() 设置颜色/大小/边框
│       ├─ new CSS3DObject(element) 包装为 3D 对象
│       ├─ 随机初始位置（4000×4000×4000 范围内）
│       └─ scene.add(object)
│
├─ 6. 预计算两种布局的顶点坐标
│     ├─ targets.table  ← createTableVertices()  横铺网格布局
│     └─ targets.sphere ← createSphereVertices()  球形布局
│
└─ 7. transform(targets.table, 1000ms) → 卡片飞到横铺布局
```

### 4.4 两种 3D 布局算法

#### ① 横铺表格布局 (`createTableVertices`)

将卡片排列为二维网格（`rowCount` 行 × 7 列），所有卡片在 z=0 平面上展开：

```typescript
object.position.x = tableData[i].x * (cardWidth + 40) - rowCount * 90
object.position.y = -tableData[i].y * (cardHeight + 20) + 1000
object.position.z = 0
```

#### ② 球体布局 (`createSphereVertices`)

使用**斐波那契球面分布**（Fibonacci Sphere）均匀分布卡片，通过 `sqrt(n × π) × acos(...)` 实现，比简单经纬度均匀采点效果更好：

```typescript
const phi = Math.acos(-1 + (2 * i) / objectsLength)       // 极角
const theta = Math.sqrt(objectsLength * Math.PI) * phi    // 方位角（斐波那契球）
object.position.x = 800 * Math.cos(theta) * Math.sin(phi)
object.position.y = 800 * Math.sin(theta) * Math.sin(phi)
object.position.z = -800 * Math.cos(phi)

// 每个对象朝向球心
vector.copy(object.position).multiplyScalar(2)
object.lookAt(vector)
```

### 4.5 抽奖状态机与 3D 动画流程

```
状态枚举 LotteryStatus:
  init(0) → ready(1) → running(2) → end(3) → init(0) 循环
```

```
用户操作          状态变化              3D 动画              音乐/特效
─────────        ────────             ──────              ────────
页面加载     →   init               卡片随机散落 + 飞到横铺
按空格/按钮  →   enterLottery()     横铺→球体变换           停止音乐
                                    场景旋转 0.1圈/2s
按空格/按钮  →   startLottery()      场景快速旋转 10圈/3s   播放世界杯音乐
                                    卡片内容随机闪烁（200ms/次）
按空格/按钮  →   stopLottery()       场景急停→0圈/1s        停止音乐+播放中奖音效
                                    中奖卡片飞到前景(z=1000) canvas-confetti撒花
                                    相机复位到正面
按空格/按钮  →   continueLottery()   球体→横铺变换           清空中奖卡片
                                    回到 ready 状态
按 ESC      →   quitLottery()       任意状态→球体           停止音乐
```

### 4.6 动画系统详解

项目使用 **@tweenjs/tween.js** 作为 3D 动画引擎：

```typescript
// 核心模式：每个 CSS3DObject 独立补间
new TWEEN.Tween(object.position)
    .to({ x, y, z }, Math.random() * duration + duration)  // 随机时长增加自然感
    .easing(TWEEN.Easing.Exponential.InOut)               // 缓入缓出
    .start()

new TWEEN.Tween(object.rotation)
    .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
        Math.random() * duration + duration)
    .easing(TWEEN.Easing.Exponential.InOut)
    .start()

// 还有一个"空"补间驱动 render 循环
new TWEEN.Tween({}).to({}, duration * 2)
    .onUpdate(render)    // 每帧重新渲染
    .start()
```

**动画循环**：

```typescript
function animation() {
    TWEEN.update()       // 更新所有补间
    controls.update()    // 更新轨道控制器
    requestAnimationFrame(animation)  // 持续循环
}
```

### 4.7 中奖卡片定位算法

中奖后卡片需要从球体中"飞出"到屏幕中央展示，使用了自适应的二维排版算法（`useElementPosition`）：

```
useElementPosition()  // hooks/useElement/index.ts
│
├─ cardRule 预定义表（1~30人中奖的排版规则）
│   例：6人 → 2行，每行3个，scale=2
│       10人 → 2行，每行5个，scale=2
│       20人 → 3行，6+7+7，scale=1.6
│
├─ 超过30人自动生成规则（createRuleForCount）
│
├─ 计算每张卡片的(行, 列)位置
├─ 水平/垂直居中排列
└─ 返回 { xTable, yTable, scale }
```

### 4.8 关键依赖说明

| npm 包 | 版本 | 作用 |
|--------|------|------|
| `three` | 0.166.0 | 3D 核心库（场景、相机、对象） |
| `three-css3d` | 1.0.6 | CSS3D 渲染器 + CSS3DObject |
| `@tweenjs/tween.js` | 23.1.2 | 补间动画引擎（位置/旋转/相机） |
| `TrackballControls` | (three examples) | 轨道球鼠标交互（拖拽旋转/缩放） |
| `gsap` | 3.14.2 | 奖项列表 UI 动画（2D DOM 部分） |
| `sparticles` | 1.3.1 | Canvas 星空粒子背景 |
| `canvas-confetti` | 1.9.4 | 中奖后撒花特效 |

### 4.9 全局 THREE 挂载

在 `src/main.ts:52` 有个关键操作：

```typescript
app.config.globalProperties.$THREE = THREE  // 挂载 THREE 到 Vue 全局属性
```

这意味着任何 Vue 组件都可以通过 `this.$THREE`（Options API）或 `getCurrentInstance().appContext.config.globalProperties.$THREE`（Composition API）访问整个 Three.js 库，方便在组件内动态创建 3D 对象。

---

## 五、数据流

```
Pinia Store（localStorage 持久化）
│
├── personConfig:  人员名单 + 已中奖名单
├── prizeConfig:   奖项配置（抽几轮/每轮几人/自定义分批）
├── globalConfig:  主题/颜色/字体/卡片大小/行数/背景图/音乐开关
├── serverConfig:  WebSocket 连接配置
└── system:        系统状态
        │
        ▼
useViewModel() 读取 store → 生成 tableData → 创建 3D 卡片 → 驱动动画
```

---

## 六、核心文件索引

| 文件 | 说明 |
|------|------|
| `src/main.ts` | 应用入口，挂载 THREE 到 Vue 全局属性 |
| `src/router/index.ts` | 路由配置（Home / Config / Demo / Mobile） |
| `src/views/Home/useViewModel.ts` | **3D 核心逻辑**：场景初始化、动画控制、状态机、音效 |
| `src/views/Home/utils/table.ts` | 几何布局算法（斐波那契球面、横铺网格）、撒花特效 |
| `src/views/Home/utils/random.ts` | 加密安全随机抽取算法 |
| `src/views/Home/type.ts` | LotteryStatus 状态枚举 |
| `src/hooks/useElement/index.ts` | 卡片样式、中奖卡片排版规则表 |
| `src/style/style.scss` | 3D 卡片 CSS 样式（.element-card / .lucky-element-card） |
| `src/views/Home/components/StarsBackground/index.vue` | 星空粒子背景 |
| `src/store/index.ts` | Pinia Store 聚合入口 |

---

## 七、总结

这是一个设计精巧的 3D 抽奖项目，核心亮点：

1. **CSS3DRenderer + Three.js** 的方案避免了 WebGL 文字渲染模糊的问题，让每张卡片保持 DOM 的清晰度和 CSS 灵活性
2. **Tween.js 驱动的补间动画**实现流畅的"横铺 ↔ 球体"变换，每张卡片独立随机时长增加自然感
3. **斐波那契球面算法**保证球体布局时卡片均匀分布
4. **加密安全随机**（`crypto.getRandomValues`）保证抽奖公平性
5. **自适应排版**根据中奖人数动态计算卡片展示位置
6. 完整的**状态机 + 键盘快捷键 + 音效系统**打造沉浸式抽奖体验
