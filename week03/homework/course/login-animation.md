# 登录页角色动画实现说明（可复现源码级）

本文档用于复现 `login` 页面左侧的角色动画效果（紫/黑/橙/黄角色 + 眼睛注视/眨眼 + 显示密码时的“偷瞄”效果）。

## 1. 入口与文件清单

1. 登录页入口（状态来源与组件挂载）
   - `src/app/(auth)/login/page.tsx`
   - 关键点：将 `isTyping`、`showPassword`、`passwordLength` 作为 props 传入 `AnimatedCharacters`

2. 动画组件（纯前端用 `div` 画角色并用鼠标计算动态）
   - `src/components/ui/animated-characters.tsx`
   - 关键点：内部包含 `Pupil`、`EyeBall` 两个子组件 + 一组状态机控制眨眼/对视/偷瞄

3. 相关交互控件（状态触发）
   - `src/app/(auth)/login/page.tsx`
   - Email 输入框：`onFocus/onBlur` 控制 `isTyping`
   - Password “眼睛”按钮：点击切换 `showPassword`
   - `passwordLength` 来自 `form.watch("password").length`

## 2. 动画总体结构（DOM/渲染方式）

`AnimatedCharacters` 使用一个固定容器：

- 容器：`<div className="relative" style={{ width: '550px', height: '400px' }}>`
- 角色由 4 个绝对定位层叠加构成（从后到前，zIndex 递增）：
  - 紫色角色（Back layer）：zIndex `1`
  - 黑色角色（Middle layer）：zIndex `2`
  - 橙色半圆（Front left）：zIndex `3`
  - 黄色角色（Front right）：zIndex `4`

每个角色主体都通过 `transform: skewX(...)` / `translateX(...)` 进行“身体倾斜”与“横向挤压”效果。

## 3. 关键视觉常量（必须一致）

### 3.1 尺寸与位置

紫色（Back）
- `left: 70px`
- `width: 180px`
- `height: (isTyping || isHidingPassword) ? 440px : 400px`
- `borderRadius: '10px 10px 0 0'`

黑色（Middle）
- `left: 240px`
- `width: 120px`
- `height: 310px`
- `borderRadius: '8px 8px 0 0'`

橙色（Front left）
- `left: 0px`
- `width: 240px`
- `height: 200px`
- `borderRadius: '120px 120px 0 0'`

黄色（Front right）
- `left: 310px`
- `width: 140px`
- `height: 230px`
- `borderRadius: '70px 70px 0 0'`
- 口部横线：
  - `w-20`、`h-[4px]`、`bg-[#2D2D2D]`、`borderRadius: 'full'`

### 3.2 颜色

- 紫色：`#6C3FF5`
- 黑色：`#2D2D2D`
- 橙色：`#FF9B6B`
- 黄色：`#E8D754`
- 眼球白（EyeBall 的 `eyeColor`）：`white`
- 瞳孔（Pupil/ EyeBall 的 `pupilColor`）：`#2D2D2D`

## 4. 动态驱动来源（鼠标跟随计算）

`AnimatedCharacters` 在组件内对 `window` 注册一次全局 `mousemove`：

- `setMouseX(e.clientX)`
- `setMouseY(e.clientY)`

并对四个角色分别计算 `faceX/faceY/bodySkew`：

通用计算（函数 `calculatePosition(ref)`）：

1. 读取角色元素边界：
   - `rect = ref.current.getBoundingClientRect()`
   - `centerX = rect.left + rect.width / 2`
   - `centerY = rect.top + rect.height / 3`
2. 计算偏移：
   - `deltaX = mouseX - centerX`
   - `deltaY = mouseY - centerY`
3. 限幅并输出：
   - `faceX = clamp(-15, 15, deltaX / 20)`
   - `faceY = clamp(-10, 10, deltaY / 30)`
   - `bodySkew = clamp(-6, 6, -deltaX / 120)`

其中 clamp 使用等价逻辑：

```ts
Math.max(min, Math.min(max, value))
```

> 注意：该实现目前没有 `prefers-reduced-motion` 或节流/防抖，依赖鼠标移动触发 state 更新（会随 `mousemove` 更新 DOM 的 `transform/left/top`）。

## 5. 子组件行为复现

### 5.1 `EyeBall`（带白眼与瞳孔 + 眨眼）

`EyeBall` 的关键行为：

- 自带 `mousemove` 监听（与 `AnimatedCharacters` 独立；但同样使用 `clientX/clientY` 计算瞳孔偏移）
- 允许通过 `forceLookX/forceLookY` 强制注视方向（当传入这两个值时，不用鼠标计算）
- 眨眼：
  - `isBlinking === true` 时，外层高度从 `${size}px` 变为 `'2px'`
  - 眨眼期间隐藏瞳孔层（`!isBlinking` 才渲染瞳孔 div）
- 瞳孔移动：用 `transform: translate(x, y)`
- 瞳孔移动过渡：`transition: transform 0.1s ease-out`

瞳孔计算逻辑（当未提供 `forceLookX/forceLookY`）：
- 找到眼睛中心：
  - `eyeCenterX = eye.left + eye.width / 2`
  - `eyeCenterY = eye.top + eye.height / 2`
- `deltaX/deltaY` -> `distance = min(sqrt(dx^2+dy^2), maxDistance)`
- `angle = atan2(dy, dx)`
- `x = cos(angle) * distance`
- `y = sin(angle) * distance`

### 5.2 `Pupil`（只有瞳孔，不带白眼）

`Pupil` 是更简化版本：
- 外层是一个圆形 div，大小为 `size`
- 直接使用 `transform: translate(mouse-based or force)` 来移动
- `transition: transform 0.1s ease-out`

## 6. 状态机（眨眼/对视/偷瞄）与触发条件

`AnimatedCharacters` 内部状态：

- `isPurpleBlinking: boolean`
- `isBlackBlinking: boolean`
- `isLookingAtEachOther: boolean`
- `isPurplePeeking: boolean`

### 6.1 紫色眨眼（Purple blinking）

随机间隔调度：
- 每次间隔：`Math.random() * 4000 + 3000`（即 3000ms ~ 7000ms）
- 触发眨眼：
  - `setIsPurpleBlinking(true)`
  - 150ms 后 `setIsPurpleBlinking(false)`
- 结束后再次递归 schedule

### 6.2 黑色眨眼（Black blinking）

同紫色逻辑，只是使用 `isBlackBlinking`。

### 6.3 对视（Typing focus 触发）

触发条件：`isTyping === true`

行为：
- `setIsLookingAtEachOther(true)`
- 800ms 后 `setIsLookingAtEachOther(false)`

### 6.4 偷瞄（Show password 且输入密码存在）

触发条件：
- `passwordLength > 0 && showPassword === true`

行为（循环调度）：
- 先延迟一个随机区间再进入 peeking：
  - `peekInterval = setTimeout(..., Math.random() * 3000 + 2000)`（2000ms ~ 5000ms）
- peeking 开始：
  - `setIsPurplePeeking(true)`
  - 800ms 后 `setIsPurplePeeking(false)`
- 不满足触发条件时：`setIsPurplePeeking(false)`

## 7. 角色视觉如何随状态变化（必须按条件复现）

### 7.1 紫色角色身体高度

- `height = 440px` 当 `(isTyping || isHidingPassword)` 为真
- 否则 `height = 400px`
- 其中 `isHidingPassword = passwordLength > 0 && !showPassword`

### 7.2 紫色角色身体倾斜与横向偏移

紫色 transform 优先级：

1. 当 `(passwordLength > 0 && showPassword)`：
   - `transform: skewX(0deg)`
2. 否则当 `(isTyping || isHidingPassword)`：
   - `transform: skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
3. 否则：
   - `transform: skewX(${purplePos.bodySkew}deg)`

### 7.3 紫色眼睛注视（EyeBall forceLook）

眼睛两枚 EyeBall 的 `forceLook` 逻辑一致，且两枚 eye 分别在同样的 `forceLookX/forceLookY` 下渲染。

在满足 `passwordLength > 0 && showPassword` 时：
- `forceLookX = (isPurplePeeking ? 4 : -4)`
- `forceLookY = (isPurplePeeking ? 5 : -4)`

否则当 `isLookingAtEachOther === true`：
- `forceLookX = 3`
- `forceLookY = 4`

否则未强制注视（`undefined`），EyeBall 会使用鼠标计算瞳孔位置。

紫色眼睛的外层 `left/top` 偏移：
- `left = (passwordLength > 0 && showPassword) ? 20px : isLookingAtEachOther ? 55px : 45 + purplePos.faceX`
- `top  = (passwordLength > 0 && showPassword) ? 35px : isLookingAtEachOther ? 65px : 40 + purplePos.faceY`

### 7.4 黑色角色身体倾斜与眼睛注视

黑色 transform 优先级：

1. 当 `(passwordLength > 0 && showPassword)`：
   - `skewX(0deg)`
2. 否则当 `isLookingAtEachOther === true`：
   - `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
3. 否则当 `(isTyping || isHidingPassword)`：
   - `skewX(${blackPos.bodySkew * 1.5}deg)`
4. 否则：
   - `skewX(${blackPos.bodySkew}deg)`

黑色眼睛外层偏移：
- `left = (passwordLength > 0 && showPassword) ? 10px : isLookingAtEachOther ? 32px : 26 + blackPos.faceX`
- `top  = (passwordLength > 0 && showPassword) ? 28px : isLookingAtEachOther ? 12px : 32 + blackPos.faceY`

强制注视（passwordLength>0 && showPassword）：
- `forceLookX = -4`
- `forceLookY = -4`

对视时（isLookingAtEachOther）：
- `forceLookX = 0`
- `forceLookY = -4`

### 7.5 橙色与黄色：只移动瞳孔与嘴巴线

橙色 transform：
- 当 `(passwordLength > 0 && showPassword)`：
  - `skewX(0deg)`
- 否则：
  - `skewX(${orangePos.bodySkew}deg)`

橙色眼睛（两个 Pupil）：
- 外层偏移：
  - `left = showPassword ? 50px : 82 + orangePos.faceX`
  - `top  = showPassword ? 85px : 90 + orangePos.faceY`
- Pupil 强制注视：
  - `forceLookX = -5`
  - `forceLookY = -4`

黄色 transform：
- 当 `(passwordLength > 0 && showPassword)`：
  - `skewX(0deg)`
- 否则：
  - `skewX(${yellowPos.bodySkew}deg)`

黄色眼睛（两个 Pupil）：
- 外层偏移：
  - `left = showPassword ? 20px : 52 + yellowPos.faceX`
  - `top  = showPassword ? 35px : 40 + yellowPos.faceY`
- Pupil 强制注视：
  - `forceLookX = -5`
  - `forceLookY = -4`

黄色嘴巴线：
- `left = showPassword ? 10px : 40 + yellowPos.faceX`
- `top  = showPassword ? 88px : 88 + yellowPos.faceY`

## 8. 与登录页交互如何对齐（复现入口参数）

在 `src/app/(auth)/login/page.tsx` 中：

1. `isTyping`：
   - Email 输入框 `onFocus => setIsTyping(true)`
   - Email 输入框 `onBlur  => setIsTyping(false)`
2. `showPassword`：
   - 点击 Password 右侧眼睛按钮：`setShowPassword(!showPassword)`
3. `passwordLength`：
   - `password.length`（来自 `react-hook-form` 的 `form.watch("password")`）
4. 渲染：
   - `<AnimatedCharacters isTyping={isTyping} showPassword={showPassword} passwordLength={password.length} />`

## 9. 复现注意事项（为了“一模一样”）

- 必须复现以下“数值常量”：
  - 容器宽高：`550x400`
  - 角色 left/width/height/borderRadius
  - 鼻眼缩放/眨眼时长：150ms
  - 对视时长：800ms
  - 偷瞄时长：800ms，偷瞄间隔：2000~5000ms
  - 鼠标计算限幅：`faceX[-15,15]`、`faceY[-10,10]`、`bodySkew[-6,6]`
  - 眨眼间隔：3000~7000ms
- 触发方式必须一致：
  - isTyping 由 Email 输入框 focus/blur 决定
  - showPassword 由密码眼睛按钮点击决定
  - passwordLength 来自密码字符串长度
- 当前实现没有做 `prefers-reduced-motion` 降级与节流；若你要保持一致观感，请不要额外改动为 `requestAnimationFrame` 或降低频率。

## 10. 你可以直接用于对照的源码位置

- 动画组件：`src/components/ui/animated-characters.tsx`
- 登录页状态传参：`src/app/(auth)/login/page.tsx`

