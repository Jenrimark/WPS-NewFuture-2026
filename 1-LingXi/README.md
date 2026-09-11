# 灵犀 AI 对话助手 - Week01 作业


## 项目基本信息

| 字段 | 内容 |
|------|------|
| 姓名 | 吴汉东 |
| 学校 | 中国地质大学（武汉） |
| 学号 | 20231003912 |
| 项目 | 仿 WPS 灵犀风格 AI 对话助手 |
| 技术栈 | HTML + CSS + Vanilla JS（无框架） |
| 模型接入 | 阿里云百炼（qwen-vl-plus / qwen-plus / qwen3-235b-a22b 等多模型） |
| 启动方式 | VS Code Live Server 打开 `index.html` |

---

## 开发任务索引

### 基础要求（老师要求）

| # | 功能 | 状态 |
|---|------|------|
| 1 | 欢迎首页（渐变标题 + 4 张快捷卡片，点击发送） | ✅ |
| 2 | AI 对话（接入阿里云百炼，流式输出打字机效果） | ✅ |
| 3 | Markdown 渲染（标题/表格/代码块/列表/引用） | ✅ |
| 4 | 代码块语法高亮 + 一键复制 | ✅ |
| 5 | 深色 / 浅色主题切换（刷新保持） | ✅ |
| 6 | 图片上传与预览 | ✅ |
| 7 | 停止生成按钮（AbortController 中断流式请求） | ✅ |
| 8 | 清除全部对话按钮（回到首页状态） | ✅ |
| 9 | Enter 发送 / Shift+Enter 换行快捷键 | ✅ |
| 10 | API Key 本地存储（key: `LINGXI_API_KEY`，不提交） | ✅ |

### 扩展功能（自主实现）

| # | 功能 | 状态 |
|---|------|------|
| 11 | 文档上传与识别（TXT / MD / PDF，pdf.js 解析） | ✅ |
| 12 | Cmd+V / Ctrl+V 粘贴图片到输入框 | ✅ |
| 13 | 多模型切换（通用 / 视觉 / 深度思考，localStorage 持久化） | ✅ |
| 14 | 深度思考模式（reasoning_content 可折叠推理块） | ✅ |
| 15 | 左侧边栏收起 / 展开（旋转动画 + 0.28s 滑动） | ✅ |
| 16 | 多会话管理（新建 / 切换 / 自动命名） | ✅ |
| 17 | 会话删除（单条 hover 删除 + 多选批量删除） | ✅ |
| 18 | 聊天记录导出（含图片，打包为 JSON 下载） | ✅ |
| 19 | 聊天记录导入（去重合并，图片写回 IndexedDB） | ✅ |
| 20 | 图片持久化（IndexedDB，绕过 localStorage 5MB 限制） | ✅ |
| 21 | 图片 / 文件 Lightbox 全屏预览 | ✅ |
| 22 | AI 回复操作栏（复制 / 重新生成 / 翻页 / 删除一问一答）+ 多版本持久化（切换会话后翻页器状态保留） | ✅ |
| 23 | 自定义品牌 Logo + 橙色系配色 | ✅ |
| 24 | 用户 / AI 自定义头像（me.jpg / LOGO-little.png） | ✅ |
| 25 | 浏览器标签页 favicon + 自定义标题 | ✅ |

---

## 核心技术实现

### 1. SSE 流式输出 + 实时 Markdown 渲染

阿里云百炼返回 `text/event-stream`，用 `fetch` + `response.body.getReader()` 逐 chunk 读取，按 `\n` 分割后提取 `data:` 行解析 JSON。每次收到 `delta.content` 就追加到缓冲区并调用 `marked.parse()` 重新渲染，打字机效果和 Markdown 结构完整性同时保证。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `streamChat`

```js
// js/index.js - streamChat 函数
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') break;
    const json = JSON.parse(data);
    const delta = json.choices?.[0]?.delta || {};
    if (delta.content) {
      fullText += delta.content;
      bubbleEl.innerHTML = parseMarkdown(fullText); // 实时渲染
    }
  }
}
```

### 2. IndexedDB 图片持久化 + 引用机制

`localStorage` 只有 5MB，直接存 base64 图片必然溢出。图片存 IndexedDB，session 的 messages 只存引用 ID（`__imgref__`）。加载会话时异步取回，导出时打包进 JSON，导入时先写回 DB 再恢复 session。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `saveImage`

```js
// js/index.js - IndexedDB 存取
function saveImage(id, base64, mimeType) {
  const tx = imgDB.transaction('images', 'readwrite');
  tx.objectStore('images').put({ id, base64, mimeType });
}

// session 里只存引用，不存 base64
// js/index.js - serializeMessages 函数
return { type: '__imgref__', imgId: refs[refIdx++].imgId, mimeType: ... }
```

### 3. 深度思考模型双流渲染

深度思考模型同时返回 `delta.reasoning_content`（推理过程）和 `delta.content`（最终回答），两个字段分别维护独立缓冲区，推理内容渲染到可折叠紫色块，正文渲染到主气泡，互不干扰。请求体自动附加 `enable_thinking: true`。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `reasoning_content`

```js
// js/index.js - streamChat 函数内
if (delta.reasoning_content) {
  thinkingText += delta.reasoning_content;
  thinkingContentEl.textContent = thinkingText; // 渲染到推理块
}
if (delta.content) {
  fullText += delta.content;
  bubbleEl.innerHTML = parseMarkdown(fullText);  // 渲染到主气泡
}
```

### 4. AbortController 中断生成

发起请求前创建 `AbortController`，`signal` 传入 `fetch`。点击停止时调用 `abort()`，`reader.read()` 抛出 `AbortError`，catch 后正常收尾，已生成内容保留。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `AbortController`

```js
// js/index.js
abortController = new AbortController();
// fetch 请求时传入
signal: abortController.signal

// 停止按钮
function stopGeneration() {
  if (abortController) abortController.abort();
}

// catch 处理
if (err.name === 'AbortError') {
  fullText += '\n\n*[已停止生成]*'; // 保留已生成内容
}
```

### 5. AI 回复多版本管理

每个 AI 消息 DOM 节点上挂 `_versions[]` 数组和 `_currentPage` 指针。重新生成时 `push` 新版本，翻页器显示 `‹ 1/N ›`，切换页只替换 `bubble.innerHTML`，各版本原始 Markdown 独立保存。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `_versions`

```js
// js/index.js - appendAiMessage 函数
div._versions = [];
div._currentPage = 0;

function updatePager() {
  const total = div._versions.length;
  if (total <= 1) { pager.style.display = 'none'; return; }
  pager.style.display = 'flex';
  pagerLabel.textContent = `${div._currentPage + 1}/${total}`;
}
```

### 6. PDF 文字提取（pdf.js）

上传 PDF 后用 `pdf.js` 的 `getDocument` 解析，逐页调用 `getTextContent` 提取文字，拼接成带页码标注的纯文本发给 AI。扫描件图片类 PDF 无法提取会给出提示。整个过程纯前端完成。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `readPdfFile`

```js
// js/index.js - readPdfFile 函数
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const pageText = content.items.map(item => item.str).join(' ');
  fullText += `[第${i}页]\n${pageText}\n\n`;
}
```

### 7. CSS 变量主题切换

所有颜色通过 `:root` CSS 变量定义，深色主题用 `[data-theme="dark"]` 覆盖变量值。切换时只改 `document.documentElement.dataset.theme`，无需重载页面，状态存 `localStorage` 刷新保持。

> 搜索定位：VS Code `Cmd+Shift+F` 搜索 `toggleTheme`

```css
/* css/index.css */
:root { --bg-primary: #fff8f3; --accent1: #ea7828; ... }
[data-theme="dark"] { --bg-primary: #1a1008; ... }
```

```js
// js/index.js - toggleTheme 函数
function toggleTheme() {
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('LINGXI_THEME', isDark ? 'light' : 'dark');
}
```

---

## 设计思路与流程图

本项目以"轻量、可扩展、体验接近原生 App"为核心设计原则，整体分为三层：

**1. 数据层**
- 会话列表和模型配置存 `localStorage`，轻量且无需后端
- 图片 base64 单独存 `IndexedDB`，绕过 5MB 限制，session 只存 `__imgref__:uuid` 引用，保持 JSON 精简
- 导出时将 IndexedDB 图片打包进 JSON，实现完整的离线备份与恢复

**2. 通信层**
- 使用 `fetch` + `ReadableStream` 对接阿里云百炼 SSE 流式接口，逐 chunk 解析 `data:` 行
- 深度思考模型额外监听 `delta.reasoning_content`，与正文内容分流渲染
- `AbortController` 实现随时中断生成

**3. 渲染层**
- `marked.js` 解析 Markdown，`highlight.js` 做代码高亮，两者配合实现富文本回答
- 每条 AI 消息维护 `_versions[]` 版本数组，支持重新生成后翻页对比
- 主题切换通过 CSS 变量 + `data-theme` 属性实现，无需重载页面

![灵犀AI流程图](assets/流程图.svg)

---

## 项目结构

```
week01/homework/lingxi/
├── index.html                          # 主页面（Live Server 入口）
├── README.md                           # 项目说明文档
├── 吴汉东_20231003912_灵犀.mp4          # 演示视频
├── assets/
│   ├── LOGO-little.png                 # 品牌 Logo（橙色系，透明背景）
│   ├── 灵犀AI.png                       # 侧边栏字体 Logo
│   ├── me.jpg                          # 用户头像
│   └── 流程图.svg                       # 项目流程图
├── css/
│   └── index.css                       # 全局样式 + 深色/浅色主题 CSS 变量
└── js/
    └── index.js                        # 全部业务逻辑（~1300 行，无框架）
```

---

## 使用说明

1. 用 VS Code Live Server 打开 `index.html`
2. 首次使用点击右上角 🔑 图标，输入阿里云百炼 API Key（存入 `LINGXI_API_KEY`）
3. 顶栏下拉框切换模型（视觉模型支持图片上传，深度思考模型显示推理过程）
4. 支持 Cmd+V / Ctrl+V 直接粘贴图片到输入框
5. 聊天记录可通过侧边栏底部「导出」按钮保存为 JSON，「导入」按钮恢复（含图片）

---

## 遇到的问题与解决思路

### 1. localStorage 存图片超 5MB 报错

**现象**：上传图片后切换会话，控制台报 `QuotaExceededError`。

**原因**：base64 图片体积大，localStorage 5MB 上限很快触顶。

**解决**：图片存 IndexedDB，session 只存引用 ID，彻底绕过限制。

> 搜索定位：`Cmd+Shift+F` 搜索 `saveImage`

```js
// 存图片到 IndexedDB
saveImage(imgId, img.base64, img.mimeType);

// session 里只存引用
{ type: '__imgref__', imgId: 'img_xxx', mimeType: 'image/png' }

// 加载会话时异步取回
const imgData = await getImage(c.imgId);
```

---

### 2. 切换会话后翻页器消失

**现象**：对某条回复重新生成多次出现翻页器，切换到其他会话再切回来，翻页器不见了。

**原因**：`_versions[]` 挂在 DOM 节点上，切换会话时 `messagesContainer.innerHTML = ''`，DOM 清空，内存数据全丢。

**解决**：保存会话时把所有 AI 消息的 `_versions` 序列化进 session，加载时还原。

> 搜索定位：`Cmd+Shift+F` 搜索 `aiVersions`

```js
// saveCurrentSession - 序列化存入
const aiVersions = [...messagesContainer.querySelectorAll('.message.ai')]
  .map(el => el._versions || []);
chatSessions[idx].aiVersions = aiVersions;

// loadSession - 恢复时还原
el._versions = [...savedVersions];
el._currentPage = savedVersions.length - 1;
el._updatePager?.(); // 重新渲染翻页器
```

---

### 3. 用户换行发送后气泡里显示空格

**现象**：输入多行文字发送，气泡里换行符变成了空格。

**原因**：气泡用 `textContent` 赋值，浏览器会把 `\n` 折叠为空格。

**解决**：加一行 CSS，让浏览器原样渲染换行符。

> 搜索定位：`Cmd+Shift+F` 搜索 `pre-wrap`

```css
/* css/index.css */
.message.user .msg-bubble {
  white-space: pre-wrap; /* 保留换行符 */
}
```

---

### 4. 导出 JSON 导入后图片不显示

**现象**：导出的 JSON 导入后，含图片的消息图片区域空白。

**原因**：session 里存的是 `__imgref__` 引用 ID，导入时 IndexedDB 里没有对应图片数据。

**解决**：导出时把 IndexedDB 里所有引用图片打包进 JSON 的 `images` 字段，导入时先把图片写回 IndexedDB 再恢复 session。

```js
// 导出时打包图片
const images = {};
for (const imgId of allImgIds) {
  const data = await getImage(imgId);
  if (data) images[imgId] = { base64: data.base64, mimeType: data.mimeType };
}

// 导入时先写回 DB
for (const [imgId, data] of Object.entries(images)) {
  await saveImage(imgId, data.base64, data.mimeType);
}
```

---

### 5. 粘贴图片时文件名被写入输入框

**现象**：Cmd+V 粘贴图片，图片出现在预览条，但输入框里同时出现了文件名文字。

**原因**：paste 事件默认行为会把剪贴板文字内容写入 textarea。

**解决**：检测到剪贴板有文件时先 `preventDefault()` 阻止默认行为，再手动处理文件。

```js
// js/index.js - handlePaste 函数
let hasFile = false;
for (const item of items) {
  if (item.kind !== 'file') continue;
  hasFile = true;
  // 处理图片...
}
if (hasFile) e.preventDefault(); // 阻止文件名写入输入框
```

---

## 其他希望老师看到的内容

### 超出作业要求的部分

本次作业在完成所有基础要求的基础上，额外实现了 15 项扩展功能。其中几个我认为技术含量较高的点：

1. **IndexedDB + 引用机制**：解决了纯前端存储大文件的经典问题，思路来自数据库的"外键引用"概念，把大对象和索引分离存储。

2. **完整的导出/导入闭环**：不只是导出文字，图片也能完整打包和恢复，相当于实现了一个轻量的"本地云同步"。

3. **多版本回答管理**：参考了 ChatGPT 的翻页设计，每次重新生成不覆盖旧答案，用户可以对比不同版本选择最好的。

4. **深度思考双流渲染**：推理过程和最终回答是两个独立的数据流，需要同时维护两个缓冲区并分别渲染到不同 DOM 节点，这个并发处理逻辑是本次最复杂的部分。

### 学习收获

- 第一次系统使用 `ReadableStream` 处理流式数据，理解了 SSE 协议的工作方式
- 深入了解了浏览器存储方案的边界：`localStorage`（同步/5MB）vs `IndexedDB`（异步/无限制）
- 体会到纯 Vanilla JS 在没有框架的情况下管理复杂状态的挑战，也更理解了 Vue/React 解决的问题是什么
