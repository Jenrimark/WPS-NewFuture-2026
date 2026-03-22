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

// ===== IndexedDB：存储图片 base64（绕过 localStorage 5MB 限制）=====
let imgDB = null;

function openImgDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('LINGXI_IMAGES', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('images', { keyPath: 'id' });
    req.onsuccess = e => { imgDB = e.target.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

function saveImage(id, base64, mimeType) {
  return new Promise((resolve) => {
    if (!imgDB) return resolve();
    const tx = imgDB.transaction('images', 'readwrite');
    tx.objectStore('images').put({ id, base64, mimeType });
    tx.oncomplete = resolve;
    tx.onerror = resolve; // 失败也不阻塞
  });
}

function getImage(id) {
  return new Promise((resolve) => {
    if (!imgDB) return resolve(null);
    const tx = imgDB.transaction('images', 'readonly');
    const req = tx.objectStore('images').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

function deleteImages(ids) {
  if (!imgDB || !ids?.length) return;
  const tx = imgDB.transaction('images', 'readwrite');
  ids.forEach(id => tx.objectStore('images').delete(id));
}

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
async function init() {
  await openImgDB();
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

  // 历史记录管理（多选删除）
  document.getElementById('history-manage-btn').addEventListener('click', toggleManageMode);
  document.getElementById('select-all-btn').addEventListener('click', () => {
    const allIds = chatSessions.slice(0, 50).map(s => s.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      selectedIds.clear();
    } else {
      allIds.forEach(id => selectedIds.add(id));
    }
    renderHistoryList();
    updateManageBar();
  });
  document.getElementById('delete-selected-btn').addEventListener('click', () => {
    if (selectedIds.size === 0) { showToast('请先选择要删除的会话'); return; }
    deleteSessions([...selectedIds]);
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

  showChatView();

  // 把图片存入 IndexedDB，生成 imgRef 列表
  const imgRefs = [];
  for (const img of pendingImages) {
    const imgId = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await saveImage(imgId, img.base64, img.mimeType);
    imgRefs.push({ imgId, mimeType: img.mimeType });
  }

  // 构建发给 API 的消息内容（含完整 base64）
  const userContent = buildUserContent(text, pendingImages, pendingFiles);

  // 渲染用户气泡
  appendUserMessage(text, pendingImages, pendingFiles);

  chatInput.value = '';
  autoResize(chatInput);
  toggleSendBtn();
  clearImagePreviews();

  // messages 里存 imgRefs 而非完整 base64，节省 localStorage 空间
  messages.push({ role: 'user', content: userContent, _imgRefs: imgRefs.length ? imgRefs : undefined });

  const aiMsgEl = appendAiMessage('');
  const bubbleEl = aiMsgEl.querySelector('.msg-bubble');
  bubbleEl.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  await streamChat(apiKey, bubbleEl);

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

    if (fullText) {
      messages.push({ role: 'assistant', content: fullText });
      // 把这次生成的内容存入气泡的 versions
      const msgEl = bubbleEl.closest('.message');
      if (msgEl && msgEl._versions !== undefined) {
        if (msgEl._versions.length === 0) msgEl._versions.push(fullText);
        else msgEl._versions[msgEl._currentPage] = fullText; // 重新生成时替换当前页
        msgEl._updatePager?.();
      }
    }

    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

// ===== 重新生成 =====
async function regenMessage(aiMsgEl) {
  if (isStreaming) return;
  const apiKey = localStorage.getItem(API_KEY_NAME);
  if (!apiKey) { showModal(); return; }

  // 找到这条 AI 消息在 messages[] 里的索引
  const allAiEls = [...messagesContainer.querySelectorAll('.message.ai')];
  const aiIdx = allAiEls.indexOf(aiMsgEl);
  if (aiIdx < 0) return;

  // 截断 messages 到这条 AI 回复之前（重新生成不带上这条）
  // messages 里 user/assistant 交替，AI 消息对应 messages 里的 assistant
  // 找到对应的 assistant 消息索引
  let assistantCount = 0;
  let msgCutIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'assistant') {
      if (assistantCount === aiIdx) { msgCutIdx = i; break; }
      assistantCount++;
    }
  }
  const contextMessages = msgCutIdx >= 0 ? messages.slice(0, msgCutIdx) : messages.slice(0, -1);

  // 新增一个版本页
  aiMsgEl._versions.push('');
  aiMsgEl._currentPage = aiMsgEl._versions.length - 1;
  aiMsgEl._updatePager?.();

  const bubble = aiMsgEl.querySelector('.msg-bubble');
  bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

  // 临时替换 messages 上下文
  const savedMessages = messages;
  messages = contextMessages;
  await streamChat(apiKey, bubble);
  messages = savedMessages;

  // 更新 messages 里对应的 assistant 内容（用最新版本）
  if (msgCutIdx >= 0 && aiMsgEl._versions[aiMsgEl._currentPage]) {
    messages[msgCutIdx] = { role: 'assistant', content: aiMsgEl._versions[aiMsgEl._currentPage] };
  }

  saveCurrentSession();
}

// ===== 删除一问一答 =====
function deleteQAPair(aiMsgEl) {
  const allMsgs = [...messagesContainer.querySelectorAll('.message')];
  const aiIdx = allMsgs.indexOf(aiMsgEl);

  // 找前一条 user 消息
  const userMsgEl = aiIdx > 0 && allMsgs[aiIdx - 1].classList.contains('user')
    ? allMsgs[aiIdx - 1] : null;

  // 从 DOM 移除
  aiMsgEl.remove();
  userMsgEl?.remove();

  // 从 messages[] 移除对应的 user+assistant
  const allAiEls = [...messagesContainer.querySelectorAll('.message.ai')];
  // 重新计算：找到被删的 assistant 在 messages 里的位置
  let assistantCount = 0;
  const targetAssistantIdx = allAiEls.length; // 已经从 DOM 删了，所以现在的长度就是被删的索引
  let removeStart = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      if (assistantCount === 0) {
        removeStart = i;
        break;
      }
      assistantCount++;
    }
  }
  // 找到 removeStart 前的 user 消息一并删除
  if (removeStart > 0 && messages[removeStart - 1].role === 'user') {
    messages.splice(removeStart - 1, 2);
  } else if (removeStart >= 0) {
    messages.splice(removeStart, 1);
  }

  // 若对话全删完，回到欢迎页
  if (messagesContainer.querySelectorAll('.message').length === 0) {
    messages = [];
    currentSessionId = null;
    showWelcomeView();
  }

  saveCurrentSession();
  showToast('已删除此对话 🗑');
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

  // 图片
  const imgContainer = document.createElement('div');
  (images || []).forEach(img => {
    const src = `data:${img.mimeType};base64,${img.base64}`;
    const imgEl = document.createElement('img');
    imgEl.className = 'msg-image';
    imgEl.src = src;
    imgEl.alt = '上传图片';
    imgEl.addEventListener('click', () => openImgPreview(src));
    imgContainer.appendChild(imgEl);
  });

  // 文件标签
  const fileContainer = document.createElement('div');
  (files || []).forEach(f => {
    const tag = document.createElement('div');
    tag.className = 'msg-file-tag';
    tag.textContent = '📄 ' + f.name;
    tag.addEventListener('click', () => openTextPreview(f.name, f.text));
    fileContainer.appendChild(tag);
  });

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  if (div.classList.contains('user')) contentDiv.style.alignItems = 'flex-end';

  contentDiv.appendChild(fileContainer);
  contentDiv.appendChild(imgContainer);
  if (text) {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    contentDiv.appendChild(bubble);
  }
  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(new Date());
  contentDiv.appendChild(timeEl);

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = '👤';

  div.appendChild(avatar);
  div.appendChild(contentDiv);

  messagesContainer.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

// ===== 渲染 AI 消息 =====
function appendAiMessage(content) {
  const div = document.createElement('div');
  div.className = 'message ai';
  // versions 存多次重新生成的内容，currentPage 是当前显示的版本索引
  div._versions = content ? [content] : [];
  div._currentPage = 0;

  div.innerHTML = `
    <div class="msg-avatar">✨</div>
    <div class="msg-content">
      <div class="msg-bubble">${content}</div>
      <div class="msg-footer">
        <div class="msg-time">${formatTime(new Date())}</div>
        <div class="msg-actions">
          <div class="msg-pager" style="display:none;">
            <button class="msg-pager-btn prev-btn" disabled>‹</button>
            <span class="msg-pager-label">1/1</span>
            <button class="msg-pager-btn next-btn" disabled>›</button>
          </div>
          <button class="msg-action-btn copy-btn" title="复制回答">📋 复制</button>
          <button class="msg-action-btn regen-btn" title="重新生成">🔄 重新生成</button>
          <button class="msg-action-btn danger del-btn" title="删除此对话">🗑 删除</button>
        </div>
      </div>
    </div>`;

  const bubble = div.querySelector('.msg-bubble');
  const pager = div.querySelector('.msg-pager');
  const pagerLabel = div.querySelector('.msg-pager-label');
  const prevBtn = div.querySelector('.prev-btn');
  const nextBtn = div.querySelector('.next-btn');

  // 翻页
  function updatePager() {
    const total = div._versions.length;
    if (total <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pagerLabel.textContent = `${div._currentPage + 1}/${total}`;
    prevBtn.disabled = div._currentPage === 0;
    nextBtn.disabled = div._currentPage === total - 1;
  }

  prevBtn.addEventListener('click', () => {
    if (div._currentPage > 0) {
      div._currentPage--;
      bubble.innerHTML = parseMarkdown(div._versions[div._currentPage]);
      updatePager();
    }
  });
  nextBtn.addEventListener('click', () => {
    if (div._currentPage < div._versions.length - 1) {
      div._currentPage++;
      bubble.innerHTML = parseMarkdown(div._versions[div._currentPage]);
      updatePager();
    }
  });

  // 复制
  div.querySelector('.copy-btn').addEventListener('click', () => {
    const text = div._versions[div._currentPage] || bubble.innerText;
    navigator.clipboard.writeText(text).then(() => showToast('已复制回答 📋'));
  });

  // 重新生成
  div.querySelector('.regen-btn').addEventListener('click', () => regenMessage(div));

  // 删除（一问一答）
  div.querySelector('.del-btn').addEventListener('click', () => deleteQAPair(div));

  // 暴露 updatePager 供外部调用
  div._updatePager = updatePager;

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
  // 点击图片放大预览
  item.querySelector('img').addEventListener('click', () => {
    openImgPreview(`data:${mimeType};base64,${base64}`);
  });
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
  // 点击文件卡片预览内容
  item.querySelector('.file-preview-inner').addEventListener('click', () => {
    const file = pendingFiles[index];
    if (file) openTextPreview(file.name, file.text);
  });
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
    : (firstUserMsg?.content?.find?.(c => c.type === 'text')?.text?.slice(0, 20) || '图文对话');

  // 序列化时把 image_url 的 base64 替换为 imgId 引用，避免撑爆 localStorage
  const serializeMessages = (msgs) => msgs.map(msg => {
    if (msg.role !== 'user' || !msg._imgRefs?.length) return msg;
    const refs = msg._imgRefs;
    let refIdx = 0;
    const content = Array.isArray(msg.content)
      ? msg.content.map(c => {
          if (c.type === 'image_url' && refs[refIdx]) {
            return { type: '__imgref__', imgId: refs[refIdx++].imgId, mimeType: refs[refIdx - 1]?.mimeType };
          }
          return c;
        })
      : msg.content;
    return { role: msg.role, content };
  });

  if (currentSessionId) {
    const idx = chatSessions.findIndex(s => s.id === currentSessionId);
    if (idx !== -1) {
      chatSessions[idx].messages = serializeMessages(messages);
      chatSessions[idx].title = title;
    }
  } else {
    currentSessionId = Date.now().toString();
    chatSessions.unshift({ id: currentSessionId, title, messages: serializeMessages(messages) });
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

// ===== 导出会话（含图片）=====
async function exportSessions() {
  if (chatSessions.length === 0) { showToast('暂无聊天记录可导出'); return; }

  showToast('正在打包图片数据... ⏳');

  // 收集所有 imgId
  const allImgIds = new Set();
  chatSessions.forEach(s => s.messages?.forEach(msg => {
    if (Array.isArray(msg.content)) {
      msg.content.forEach(c => { if (c.type === '__imgref__') allImgIds.add(c.imgId); });
    }
  }));

  // 从 IndexedDB 取出图片数据
  const images = {};
  for (const imgId of allImgIds) {
    const data = await getImage(imgId);
    if (data) images[imgId] = { base64: data.base64, mimeType: data.mimeType };
  }

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions: chatSessions,
    images, // 图片数据随 JSON 一起导出
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lingxi-sessions-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${chatSessions.length} 条会话 📤`);
}

// ===== 导入会话（含图片）=====
function importSessions(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const imported = parsed.sessions || parsed;
      if (!Array.isArray(imported)) throw new Error('格式不正确');

      // 写回图片到 IndexedDB
      const images = parsed.images || {};
      for (const [imgId, data] of Object.entries(images)) {
        await saveImage(imgId, data.base64, data.mimeType);
      }

      const existingIds = new Set(chatSessions.map(s => s.id));
      const newSessions = imported.filter(s => !existingIds.has(s.id));
      chatSessions = [...newSessions, ...chatSessions];
      localStorage.setItem('LINGXI_SESSIONS', JSON.stringify(chatSessions));
      renderHistoryList();
      showToast(`已导入 ${newSessions.length} 条新会话 📥`);
    } catch {
      showToast('导入失败，请检查文件格式 ❌');
    }
    e.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

// ===== 历史列表渲染 =====
let isManageMode = false;
let selectedIds = new Set();

function renderHistoryList() {
  historyList.innerHTML = '';
  chatSessions.slice(0, 50).forEach(session => {
    const item = document.createElement('div');
    item.className = 'chat-history-item' + (session.id === currentSessionId ? ' active' : '');
    item.dataset.id = session.id;

    if (isManageMode) {
      const checked = selectedIds.has(session.id);
      item.innerHTML = `
        <input type="checkbox" class="item-checkbox" ${checked ? 'checked' : ''} />
        <span class="item-title">${session.title}</span>`;
      item.querySelector('.item-checkbox').addEventListener('change', (e) => {
        e.stopPropagation();
        if (e.target.checked) selectedIds.add(session.id);
        else selectedIds.delete(session.id);
        updateManageBar();
      });
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-checkbox')) return;
        const cb = item.querySelector('.item-checkbox');
        cb.checked = !cb.checked;
        if (cb.checked) selectedIds.add(session.id);
        else selectedIds.delete(session.id);
        updateManageBar();
      });
    } else {
      item.innerHTML = `
        <span class="item-icon">💬</span>
        <span class="item-title">${session.title}</span>
        <button class="item-delete-btn" title="删除">🗑</button>`;
      item.querySelector('.item-title').addEventListener('click', () => loadSession(session.id));
      item.querySelector('.item-icon').addEventListener('click', () => loadSession(session.id));
      item.querySelector('.item-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSessions([session.id]);
      });
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-delete-btn')) return;
        loadSession(session.id);
      });
    }

    historyList.appendChild(item);
  });
}

function updateManageBar() {
  const btn = document.getElementById('delete-selected-btn');
  btn.textContent = selectedIds.size > 0 ? `删除选中 (${selectedIds.size})` : '删除选中';
}

function toggleManageMode() {
  isManageMode = !isManageMode;
  selectedIds.clear();
  document.getElementById('history-manage-btn').textContent = isManageMode ? '完成' : '管理';
  document.getElementById('history-manage-bar').classList.toggle('visible', isManageMode);
  renderHistoryList();
}

function deleteSessions(ids) {
  chatSessions = chatSessions.filter(s => !ids.includes(s.id));
  localStorage.setItem('LINGXI_SESSIONS', JSON.stringify(chatSessions));
  // 若删除的是当前会话，回到欢迎页
  if (ids.includes(currentSessionId)) {
    messages = [];
    currentSessionId = null;
    topbarTitle.textContent = '灵犀 AI 助手';
    showWelcomeView();
  }
  selectedIds.clear();
  updateManageBar();
  renderHistoryList();
  showToast(`已删除 ${ids.length} 条会话`);
}

async function loadSession(id) {
  const session = chatSessions.find(s => s.id === id);
  if (!session) return;
  currentSessionId = id;
  topbarTitle.textContent = session.title;
  showChatView();
  messagesContainer.innerHTML = '';

  // 恢复 messages：把 __imgref__ 还原为完整 image_url
  messages = [];
  for (const msg of session.messages) {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const restored = [];
      const imgObjs = []; // 用于渲染气泡
      for (const c of msg.content) {
        if (c.type === '__imgref__') {
          const imgData = await getImage(c.imgId);
          if (imgData) {
            const url = `data:${imgData.mimeType};base64,${imgData.base64}`;
            restored.push({ type: 'image_url', image_url: { url } });
            imgObjs.push({ base64: imgData.base64, mimeType: imgData.mimeType, name: 'image' });
          }
        } else {
          restored.push(c);
        }
      }
      const text = restored.find(c => c.type === 'text')?.text || '';
      messages.push({ role: 'user', content: restored });
      appendUserMessage(text, imgObjs, []);
    } else if (msg.role === 'user') {
      messages.push(msg);
      appendUserMessage(typeof msg.content === 'string' ? msg.content : '', [], []);
    } else if (msg.role === 'assistant') {
      messages.push(msg);
      const el = appendAiMessage('');
      el.querySelector('.msg-bubble').innerHTML = parseMarkdown(msg.content);
    }
  }

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
// ===== 预览层 =====
const previewOverlay = document.getElementById('preview-overlay');
const previewImgWrap = document.getElementById('preview-img-wrap');
const previewImg = document.getElementById('preview-img');
const previewTextWrap = document.getElementById('preview-text-wrap');
const previewTextFilename = document.getElementById('preview-text-filename');
const previewTextContent = document.getElementById('preview-text-content');

function openImgPreview(src) {
  previewImg.src = src;
  previewImgWrap.style.display = 'flex';
  previewImgWrap.style.alignItems = 'center';
  previewImgWrap.style.justifyContent = 'center';
  previewTextWrap.style.display = 'none';
  previewOverlay.style.display = 'flex';
  previewOverlay.classList.remove('hidden');
}

function openTextPreview(filename, text) {
  previewTextFilename.textContent = '📄 ' + filename;
  previewTextContent.textContent = text;
  previewTextWrap.style.display = 'flex';
  previewImgWrap.style.display = 'none';
  previewOverlay.style.display = 'flex';
  previewOverlay.classList.remove('hidden');
}

function closePreview() {
  previewOverlay.style.display = 'none';
  previewOverlay.classList.add('hidden');
  previewImgWrap.style.display = 'none';
  previewTextWrap.style.display = 'none';
  previewImg.src = '';
}

document.getElementById('preview-close').addEventListener('click', closePreview);
previewOverlay.addEventListener('click', (e) => {
  if (e.target === previewOverlay) closePreview();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePreview();
});

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

// toggleThinking 供 HTML onclick 调用
window.toggleThinking = function(header) {
  header.classList.toggle('collapsed');
  header.nextElementSibling.classList.toggle('hidden');
};

// ===== 启动 =====
init();
