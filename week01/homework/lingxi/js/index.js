/* ===================================================
   灵犀 AI 助手 - 核心逻辑
   技术栈: HTML + CSS + Vanilla JS
   模型: 阿里云百炼 (qwen-plus)
   =================================================== */

// ===== 常量 =====
const API_KEY_NAME = 'LINGXI_API_KEY';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 当前模型配置（从 localStorage 恢复或默认）
let currentModel = localStorage.getItem('LINGXI_MODEL') || 'qwen-vl-plus';
let currentModelVision = localStorage.getItem('LINGXI_MODEL_VISION') !== 'false';
let currentModelThinking = localStorage.getItem('LINGXI_MODEL_THINKING') === 'true';

// ===== DOM 引用 =====
const chatArea = document.getElementById('chat-area');
const welcomeScreen = document.getElementById('welcome-screen');
const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const imageUpload = document.getElementById('image-upload');
const imagePreviewStrip = document.getElementById('image-preview-strip');
const modalOverlay = document.getElementById('modal-overlay');
const apiKeyInput = document.getElementById('api-key-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const toast = document.getElementById('toast');
const historyList = document.getElementById('history-list');
const topbarTitle = document.getElementById('topbar-title');

// ===== 状态 =====
let messages = [];          // 当前对话消息列表
let pendingImages = [];     // 待发送图片 [{base64, mimeType, name}]
let pendingFiles = [];      // 待发送文档 [{name, text}]
let abortController = null; // 用于中断流式请求
let isStreaming = false;
let chatSessions = [];      // 历史会话列表
let currentSessionId = null;

// ===== 初始化 =====
function init() {
  applyTheme();
  loadHistory();
  renderHistoryList();
  initModelSelector();

  if (!localStorage.getItem(API_KEY_NAME)) {
    showModal();
  }

  bindEvents();
  configureMarked();
}

// ===== 模型选择 =====
function initModelSelector() {
  selectModel(currentModel, currentModelVision, currentModelThinking, true);
}

function selectModel(model, vision, thinking, silent = false) {
  currentModel = model;
  currentModelVision = vision;
  currentModelThinking = thinking;
  localStorage.setItem('LINGXI_MODEL', model);
  localStorage.setItem('LINGXI_MODEL_VISION', vision);
  localStorage.setItem('LINGXI_MODEL_THINKING', thinking);

  // 更新按钮文字
  document.getElementById('model-label').textContent = model;

  // 更新小圆点颜色
  const dot = document.querySelector('.model-dot');
  dot.className = 'model-dot' + (thinking ? ' thinking' : vision ? ' vision' : '');

  // 更新选中状态
  document.querySelectorAll('.model-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.model === model);
  });

  if (!silent) showToast(`已切换到 ${model}`);
}

// ===== marked.js 配置 =====
function configureMarked() {
  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
  });

  // 自定义 renderer：给代码块加复制按钮
  const renderer = new marked.Renderer();
  renderer.code = (code, language) => {
    const lang = language || 'plaintext';
    let highlighted;
    try {
      highlighted = hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;
    } catch {
      highlighted = code;
    }
    const id = 'code-' + Math.random().toString(36).slice(2, 8);
    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>${lang}</span>
          <button class="copy-btn" onclick="copyCode('${id}')">复制</button>
        </div>
        <pre><code id="${id}" class="hljs language-${lang}">${highlighted}</code></pre>
      </div>`;
  };
  marked.use({ renderer });
}

// ===== 事件绑定 =====
function bindEvents() {
  // 发送
  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 输入框自动高度 & 发送按钮显示
  chatInput.addEventListener('input', () => {
    autoResize(chatInput);
    toggleSendBtn();
  });

  // 停止生成
  stopBtn.addEventListener('click', stopGeneration);

  // 图片上传
  imageUpload.addEventListener('change', handleImageUpload);

  // 粘贴图片/文件（Ctrl+V / Cmd+V）
  chatInput.addEventListener('paste', handlePaste);
  // 输入框未聚焦时也能捕获粘贴
  document.addEventListener('paste', (e) => {
    if (document.activeElement !== chatInput && !modalOverlay.contains(document.activeElement)) {
      handlePaste(e);
    }
  });

  // 快捷卡片
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      chatInput.value = prompt;
      toggleSendBtn();
      handleSend();
    });
  });

  // 侧边栏收起/展开
  const sidebar = document.querySelector('.sidebar');
  const expandBtn = document.getElementById('sidebar-expand-btn');
  document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    expandBtn.classList.remove('hidden');
  });
  expandBtn.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    expandBtn.classList.add('hidden');
  });

  // 模型选择器
  const modelSelectorBtn = document.getElementById('model-selector-btn');
  const modelDropdown = document.getElementById('model-dropdown');
  modelSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('hidden');
    modelSelectorBtn.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    modelDropdown.classList.add('hidden');
    modelSelectorBtn.classList.remove('open');
  });
  document.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectModel(
        opt.dataset.model,
        opt.dataset.vision === 'true',
        opt.dataset.thinking === 'true'
      );
      modelDropdown.classList.add('hidden');
      modelSelectorBtn.classList.remove('open');
    });
  });

  // 导出 / 导入
  document.getElementById('export-btn').addEventListener('click', exportSessions);
  document.getElementById('import-btn-trigger').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', importSessions);

  // 新对话
  document.getElementById('new-chat-btn').addEventListener('click', startNewChat);

  // 主题切换（侧边栏 + 顶栏）
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('theme-btn-top').addEventListener('click', toggleTheme);

  // 清除对话（侧边栏 + 顶栏）
  document.getElementById('clear-btn').addEventListener('click', clearChat);
  document.getElementById('clear-btn-top').addEventListener('click', clearChat);

  // API Key 设置（侧边栏 + 顶栏）
  document.getElementById('set-key-btn').addEventListener('click', showModal);
  document.getElementById('set-key-btn-top').addEventListener('click', showModal);

  // Modal 保存
  modalSaveBtn.addEventListener('click', saveApiKey);
  apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveApiKey(); });

  // 点击遮罩关闭 modal
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay && localStorage.getItem(API_KEY_NAME)) {
      hideModal();
    }
  });
}

// ===== 发送消息 =====
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text && pendingImages.length === 0 && pendingFiles.length === 0) return;
  if (isStreaming) return;

  const apiKey = localStorage.getItem(API_KEY_NAME);
  if (!apiKey) {
    showToast('请先设置 API Key 🔑');
    showModal();
    return;
  }

  // 隐藏欢迎页，显示消息区
  showChatView();

  // 构建用户消息内容
  const userContent = buildUserContent(text, pendingImages, pendingFiles);

  // 渲染用户消息气泡
  appendUserMessage(text, pendingImages, pendingFiles);

  // 清空输入
  chatInput.value = '';
  autoResize(chatInput);
  toggleSendBtn();
  clearImagePreviews();

  // 加入消息历史
  messages.push({ role: 'user', content: userContent });

  // 渲染 AI loading
  const aiMsgEl = appendAiMessage('');
  const bubbleEl = aiMsgEl.querySelector('.msg-bubble');
  bubbleEl.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  // 开始流式请求
  await streamChat(apiKey, bubbleEl);

  // 保存会话
  saveCurrentSession();
  renderHistoryList();
}

// ===== 构建用户消息内容（支持图文 + 文档）=====
function buildUserContent(text, images, files) {
  // 把文档内容拼接到文本前面
  let fullText = text || '';
  if (files && files.length > 0) {
    const fileParts = files.map(f =>
      `【文件：${f.name}】\n\`\`\`\n${f.text}\n\`\`\``
    ).join('\n\n');
    fullText = fileParts + (fullText ? '\n\n' + fullText : '');
  }

  if (!images || images.length === 0) return fullText;

  // 有图片时用数组格式（qwen-vl-plus 要求）
  const parts = [];
  images.forEach(img => {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
    });
  });
  if (fullText) parts.push({ type: 'text', text: fullText });
  return parts;
}

// ===== 流式请求 =====
async function streamChat(apiKey, bubbleEl) {
  isStreaming = true;
  abortController = new AbortController();
  stopBtn.classList.add('visible');
  sendBtn.classList.remove('visible');

  let fullText = '';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messages,
        stream: true,
        ...(currentModelThinking ? { enable_thinking: true } : {}),
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    bubbleEl.innerHTML = '';
    bubbleEl.classList.add('typing-cursor');

    let thinkingText = '';
    let thinkingEl = null;
    let thinkingContentEl = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta || {};

          // 深度思考内容
          if (delta.reasoning_content) {
            thinkingText += delta.reasoning_content;
            if (!thinkingEl) {
              thinkingEl = document.createElement('div');
              thinkingEl.className = 'thinking-block';
              thinkingEl.innerHTML = `
                <div class="thinking-header" onclick="toggleThinking(this)">
                  <span>🧠 深度思考过程</span>
                  <span class="think-arrow">▾</span>
                </div>
                <div class="thinking-content"></div>`;
              bubbleEl.before(thinkingEl);
              thinkingContentEl = thinkingEl.querySelector('.thinking-content');
            }
            thinkingContentEl.textContent = thinkingText;
          }

          // 正文内容
          if (delta.content) {
            fullText += delta.content;
            bubbleEl.innerHTML = parseMarkdown(fullText);
          }

          chatArea.scrollTop = chatArea.scrollHeight;
        } catch { /* 忽略解析错误 */ }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      fullText += '\n\n*[已停止生成]*';
    } else {
      fullText = `❌ 请求失败：${err.message}\n\n请检查 API Key 是否正确，或网络是否正常。`;
    }
    bubbleEl.innerHTML = parseMarkdown(fullText);
  } finally {
    bubbleEl.classList.remove('typing-cursor');
    isStreaming = false;
    abortController = null;
    stopBtn.classList.remove('visible');
    toggleSendBtn();

    // 加入 AI 回复到消息历史
    if (fullText) {
      messages.push({ role: 'assistant', content: fullText });
    }

    // 更新时间戳
    const timeEl = bubbleEl.closest('.message')?.querySelector('.msg-time');
    if (timeEl) timeEl.textContent = formatTime(new Date());

    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

// ===== 停止生成 =====
function stopGeneration() {
  if (abortController) abortController.abort();
}

// ===== Markdown 解析 =====
function parseMarkdown(text) {
  try {
    return marked.parse(text);
  } catch {
    return text;
  }
}

// ===== 渲染用户消息 =====
function appendUserMessage(text, images, files) {
  const div = document.createElement('div');
  div.className = 'message user';

  let imgHtml = '';
  (images || []).forEach(img => {
    imgHtml += `<img class="msg-image" src="data:${img.mimeType};base64,${img.base64}" alt="上传图片" />`;
  });

  let fileHtml = '';
  (files || []).forEach(f => {
    fileHtml += `<div class="msg-file-tag">📄 ${escapeHtml(f.name)}</div>`;
  });

  div.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-content">
      ${fileHtml}
      ${imgHtml}
      ${text ? `<div class="msg-bubble">${escapeHtml(text)}</div>` : ''}
      <div class="msg-time">${formatTime(new Date())}</div>
    </div>`;
  messagesContainer.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

// ===== 渲染 AI 消息 =====
function appendAiMessage(content) {
  const div = document.createElement('div');
  div.className = 'message ai';
  div.innerHTML = `
    <div class="msg-avatar">✨</div>
    <div class="msg-content">
      <div class="msg-bubble">${content}</div>
      <div class="msg-time"></div>
    </div>`;
  messagesContainer.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

// ===== 粘贴处理（支持图片 + 文档）=====
function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  let hasFile = false;
  for (const item of items) {
    if (item.kind !== 'file') continue;
    hasFile = true; // 先标记，阻止默认行为（防止文件名被粘贴进输入框）
    const file = item.getAsFile();
    if (!file) continue;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        pendingImages.push({ base64, mimeType: file.type, name: file.name || 'pasted-image.png' });
        renderImagePreview(base64, file.type, pendingImages.length - 1);
        toggleSendBtn();
        showToast('图片已粘贴 🖼️');
      };
      reader.readAsDataURL(file);
    } else {
      processDocFile(file);
    }
  }
  if (hasFile) e.preventDefault();
}

// ===== 图片上传处理 =====
function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        pendingImages.push({ base64, mimeType: file.type, name: file.name });
        renderImagePreview(base64, file.type, pendingImages.length - 1);
        toggleSendBtn();
      };
      reader.readAsDataURL(file);
    } else {
      processDocFile(file);
    }
  });
  e.target.value = '';
}

// ===== 分发文档文件处理 =====
function processDocFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf' || file.type === 'application/pdf') {
    readPdfFile(file);
  } else {
    readFileAsText(file);
  }
}

// ===== 读取文本文件 =====
function readFileAsText(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    pendingFiles.push({ name: file.name, text });
    renderFilePreview(file.name, pendingFiles.length - 1);
    toggleSendBtn();
    showToast(`文件已加载：${file.name} 📄`);
  };
  reader.onerror = () => showToast('文件读取失败，请检查文件格式');
  reader.readAsText(file, 'utf-8');
}

// ===== 读取 PDF（pdf.js 提取文字）=====
async function readPdfFile(file) {
  showToast('正在解析 PDF... ⏳');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `[第${i}页]\n${pageText}\n\n`;
    }
    if (!fullText.trim()) {
      showToast('PDF 无可提取文字（可能是扫描件图片）');
      return;
    }
    pendingFiles.push({ name: file.name, text: fullText.trim() });
    renderFilePreview(file.name, pendingFiles.length - 1);
    toggleSendBtn();
    showToast(`PDF 解析完成：${file.name} ✅`);
  } catch (err) {
    showToast('PDF 解析失败：' + err.message);
  }
}
function renderImagePreview(base64, mimeType, index) {
  const item = document.createElement('div');
  item.className = 'preview-item';
  item.dataset.index = index;
  item.dataset.type = 'image';
  item.innerHTML = `
    <img src="data:${mimeType};base64,${base64}" alt="预览" />
    <button class="preview-remove" onclick="removeImagePreview(${index})">×</button>`;
  imagePreviewStrip.appendChild(item);
}

function renderFilePreview(name, index) {
  const item = document.createElement('div');
  item.className = 'preview-item preview-file';
  item.dataset.index = index;
  item.dataset.type = 'file';
  const ext = name.split('.').pop().toUpperCase();
  item.innerHTML = `
    <div class="file-preview-inner">
      <span class="file-ext">${ext}</span>
      <span class="file-name">${name.length > 12 ? name.slice(0, 10) + '…' : name}</span>
    </div>
    <button class="preview-remove" onclick="removeFilePreview(${index})">×</button>`;
  imagePreviewStrip.appendChild(item);
}

function removeImagePreview(index) {
  pendingImages.splice(index, 1);
  rebuildPreviews();
}

function removeFilePreview(index) {
  pendingFiles.splice(index, 1);
  rebuildPreviews();
}

function rebuildPreviews() {
  imagePreviewStrip.innerHTML = '';
  pendingImages.forEach((img, i) => renderImagePreview(img.base64, img.mimeType, i));
  pendingFiles.forEach((f, i) => renderFilePreview(f.name, i));
  toggleSendBtn();
}

function clearImagePreviews() {
  pendingImages = [];
  pendingFiles = [];
  imagePreviewStrip.innerHTML = '';
}

// ===== 视图切换 =====
function showChatView() {
  welcomeScreen.style.display = 'none';
  messagesContainer.style.display = 'flex';
}

function showWelcomeView() {
  welcomeScreen.style.display = 'flex';
  messagesContainer.style.display = 'none';
  messagesContainer.innerHTML = '';
}

// ===== 新对话 =====
function startNewChat() {
  if (messages.length > 0) saveCurrentSession();
  messages = [];
  currentSessionId = null;
  topbarTitle.textContent = '灵犀 AI 助手';
  showWelcomeView();
  clearImagePreviews();
  chatInput.value = '';
  toggleSendBtn();
}

// ===== 清除对话 =====
function clearChat() {
  messages = [];
  currentSessionId = null;
  topbarTitle.textContent = '灵犀 AI 助手';
  showWelcomeView();
  clearImagePreviews();
  chatInput.value = '';
  toggleSendBtn();
  showToast('对话已清除 🗑️');
}

// ===== 会话历史 =====
function saveCurrentSession() {
  if (messages.length === 0) return;
  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = typeof firstUserMsg?.content === 'string'
    ? firstUserMsg.content.slice(0, 20)
    : '图文对话';

  if (currentSessionId) {
    const idx = chatSessions.findIndex(s => s.id === currentSessionId);
    if (idx !== -1) {
      chatSessions[idx].messages = [...messages];
      chatSessions[idx].title = title;
    }
  } else {
    currentSessionId = Date.now().toString();
    chatSessions.unshift({ id: currentSessionId, title, messages: [...messages] });
    if (chatSessions.length > 20) chatSessions.pop();
  }

  topbarTitle.textContent = title;
  localStorage.setItem('LINGXI_SESSIONS', JSON.stringify(chatSessions));
}

function loadHistory() {
  try {
    chatSessions = JSON.parse(localStorage.getItem('LINGXI_SESSIONS') || '[]');
  } catch { chatSessions = []; }
}

// ===== 导出会话 =====
function exportSessions() {
  if (chatSessions.length === 0) {
    showToast('暂无聊天记录可导出');
    return;
  }
  const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions: chatSessions }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lingxi-sessions-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${chatSessions.length} 条会话 📤`);
}

// ===== 导入会话 =====
function importSessions(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const imported = parsed.sessions || parsed; // 兼容直接是数组的格式
      if (!Array.isArray(imported)) throw new Error('格式不正确');

      // 合并：以 id 去重，导入的优先
      const existingIds = new Set(chatSessions.map(s => s.id));
      const newSessions = imported.filter(s => !existingIds.has(s.id));
      chatSessions = [...newSessions, ...chatSessions];
      localStorage.setItem('LINGXI_SESSIONS', JSON.stringify(chatSessions));
      renderHistoryList();
      showToast(`已导入 ${newSessions.length} 条新会话 📥`);
    } catch {
      showToast('导入失败，请检查文件格式 ❌');
    }
    e.target.value = ''; // 允许重复导入同一文件
  };
  reader.readAsText(file, 'utf-8');
}

function renderHistoryList() {
  historyList.innerHTML = '';
  chatSessions.slice(0, 15).forEach(session => {
    const item = document.createElement('div');
    item.className = 'chat-history-item' + (session.id === currentSessionId ? ' active' : '');
    item.innerHTML = `<span class="item-icon">💬</span><span>${session.title}</span>`;
    item.addEventListener('click', () => loadSession(session.id));
    historyList.appendChild(item);
  });
}

function loadSession(id) {
  const session = chatSessions.find(s => s.id === id);
  if (!session) return;
  currentSessionId = id;
  messages = [...session.messages];
  topbarTitle.textContent = session.title;
  showChatView();
  messagesContainer.innerHTML = '';

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const text = typeof msg.content === 'string' ? msg.content : msg.content.find(c => c.type === 'text')?.text || '';
      appendUserMessage(text, []);
    } else if (msg.role === 'assistant') {
      const el = appendAiMessage('');
      el.querySelector('.msg-bubble').innerHTML = parseMarkdown(msg.content);
    }
  });

  renderHistoryList();
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ===== 主题切换 =====
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('LINGXI_THEME', newTheme);
  updateThemeIcons(newTheme);
}

function applyTheme() {
  const saved = localStorage.getItem('LINGXI_THEME') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcons(saved);
}

function updateThemeIcons(theme) {
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('theme-btn').textContent = icon + ' 切换主题';
  document.getElementById('theme-btn-top').textContent = icon;
}

// ===== API Key Modal =====
function showModal() {
  const saved = localStorage.getItem(API_KEY_NAME) || '';
  apiKeyInput.value = saved;
  modalOverlay.classList.remove('hidden');
  setTimeout(() => apiKeyInput.focus(), 100);
}

function hideModal() {
  modalOverlay.classList.add('hidden');
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('请输入有效的 API Key'); return; }
  localStorage.setItem(API_KEY_NAME, key);
  hideModal();
  showToast('API Key 已保存 ✅');
}

// ===== 工具函数 =====
function toggleSendBtn() {
  const hasContent = chatInput.value.trim() || pendingImages.length > 0;
  sendBtn.classList.toggle('visible', !!hasContent && !isStreaming);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function formatTime(date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== 复制代码（全局函数，供 HTML onclick 调用）=====
window.toggleThinking = function(header) {
  header.classList.toggle('collapsed');
  header.nextElementSibling.classList.toggle('hidden');
};

window.copyCode = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    showToast('代码已复制 📋');
  }).catch(() => {
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    showToast('代码已复制 📋');
  });
};

window.removeImagePreview = removeImagePreview;
window.removeFilePreview = removeFilePreview;
window.removePreview = removeImagePreview; // 兼容旧引用

// ===== 启动 =====
init();
