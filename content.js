// 内容脚本 - 注入到Hellorf图片列表页和详情页，包含iframe控制面板
class ImageDownloadInjector {
  constructor() {
    this.observer = null;
    this.requestInterceptor = null;
    this.lazyLoadObserver = null;
    this.iframe = null;
    this.isPanelVisible = false;
    this.panelButton = null;
    this.downloadHistory = [];
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    this.setupRequestInterceptor();
    this.injectPanelButton();
    this.injectDownloadButtons();
    this.setupMutationObserver();
    this.setupLazyLoadObserver();
    this.setupGlobalClickListener();
    this.loadDownloadHistory();
    
    // 监听来自iframe的消息
    window.addEventListener('message', (event) => {
      this.handleIframeMessage(event);
    });
    
    // 延迟检查，确保所有图片都有机会加载
    setTimeout(() => {
      this.injectDownloadButtons();
    }, 1000);
  }

  // 注入控制面板按钮
  injectPanelButton() {
    // 移除已存在的面板按钮
    const existingButton = document.querySelector('.hellorf-panel-btn');
    if (existingButton) {
      existingButton.remove();
    }

    this.panelButton = document.createElement('button');
    this.panelButton.className = 'hellorf-panel-btn';
    this.panelButton.innerHTML = '📁 Hellorf下载器';
    this.panelButton.title = '打开下载控制面板';
    
    this.stylePanelButton(this.panelButton);
    
    this.panelButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePanel();
    });

    document.body.appendChild(this.panelButton);
  }

  // 样式化面板按钮
  stylePanelButton(button) {
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';
    button.style.background = '#4285f4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '20px';
    button.style.padding = '10px 15px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    button.style.transition = 'all 0.3s ease';
  }

  // 切换控制面板显示/隐藏
  togglePanel() {
    if (this.isPanelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  // 显示控制面板
  showPanel() {
    if (!this.iframe) {
      this.createIframe();
    }
    
    this.iframe.style.display = 'block';
    this.isPanelVisible = true;
    this.panelButton.innerHTML = '📁 关闭面板';
    this.panelButton.style.background = '#f44336';
    
    // 通知iframe面板已打开
    this.sendMessageToIframe({ action: 'panelOpened' });
  }

  // 隐藏控制面板
  hidePanel() {
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
    this.isPanelVisible = false;
    this.panelButton.innerHTML = '📁 Hellorf下载器';
    this.panelButton.style.background = '#4285f4';
  }

  // 创建iframe 
  createIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'hellorf-control-panel';
    this.iframe.srcdoc = this.getIframeHTML();
    
    // 设置iframe样式 - 修改为自适应高度
    this.iframe.style.position = 'fixed';
    this.iframe.style.top = '60px';
    this.iframe.style.right = '20px';
    this.iframe.style.width = '420px';
    this.iframe.style.height = '950px'
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '12px';
    this.iframe.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
    this.iframe.style.zIndex = '9999';
    this.iframe.style.backgroundColor = 'white';
    this.iframe.style.display = 'none';
    this.iframe.style.overflow = 'hidden'; // 隐藏iframe自身的滚动条
    
    document.body.appendChild(this.iframe);
  }

  // 生成iframe HTML内容 - 修改为自适应高度
  getIframeHTML() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            html, body {
                width: 100%;
                height: 100%;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f8f9fa;
                color: #333;
                overflow: hidden;
            }
            
            .panel-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: white;
            }
            
            .panel-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
                flex-shrink: 0;
            }
            
            .header-title {
                font-size: 16px;
                font-weight: 600;
            }
            
            .header-controls {
                display: flex;
                gap: 8px;
            }
            
            .icon-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.3s;
            }
            
            .icon-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }
            
            .panel-content {
                flex: 1;
                padding: 0;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                min-height: 0; /* 关键：允许内容区域收缩 */
            }
            
            .status-section {
                background: white;
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                flex-shrink: 0;
            }
            
            .status-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .status-title {
                font-size: 14px;
                font-weight: 600;
                color: #555;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
            }
            
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            
            .status-online {
                background: #4CAF50;
            }
            
            .status-offline {
                background: #f44336;
            }
            
            .user-info {
                background: #f1f3f4;
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 12px;
                display: none;
            }
            
            .user-info-item {
                margin-bottom: 4px;
            }
            
            .user-info-item:last-child {
                margin-bottom: 0;
            }
            
            .action-buttons {
                padding: 15px 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                border-bottom: 1px solid #eee;
                flex-shrink: 0;
            }
            
            .btn {
                padding: 10px 15px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .btn:hover {
                background: #3367d6;
            }
            
            .btn-login {
                background: #34a853;
            }
            
            .btn-login:hover {
                background: #2d9248;
            }
            
            .btn-logout {
                background: #ea4335;
            }
            
            .btn-logout:hover {
                background: #d33426;
            }
            
            .history-section {
                flex: 1;
                padding: 15px 20px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                min-height: 0; /* 关键：允许历史区域收缩 */
            }
            
            .history-title {
                font-size: 14px;
                font-weight: 600;
                color: #555;
                margin-bottom: 12px;
                flex-shrink: 0;
            }
            
            .history-container {
                flex: 1;
                overflow-y: auto;
                min-height: 0; /* 关键：允许容器收缩 */
            }
            
            .history-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .history-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                transition: all 0.3s;
                height: 80px;
                box-sizing: border-box;
            }
            
            .history-item:hover {
                background: #e9ecef;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .history-image {
                width: 60px;
                height: 60px;
                border-radius: 6px;
                object-fit: cover;
                flex-shrink: 0;
                background: #e0e0e0;
            }
            
            .history-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 100%;
            }
            
            .history-id {
                font-size: 12px;
                color: #777;
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 4px;
                display: inline-block;
            }
            
            .history-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
            }
            
            .empty-history {
                text-align: center;
                padding: 40px 0;
                color: #999;
                font-size: 13px;
            }
            
            .message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 100;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
            }
            
            .message.show {
                opacity: 1;
            }
            
            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="panel-container">
            <div class="panel-header">
                <div class="header-title">Hellorf图片下载器</div>
                <div class="header-controls">
                    <button class="icon-btn" id="refreshBtn" title="刷新状态">↻</button>
                    <button class="icon-btn" id="closeBtn" title="关闭面板">×</button>
                </div>
            </div>
            
            <div class="panel-content">
                <div class="status-section">
                    <div class="status-header">
                        <div class="status-title">账户状态</div>
                        <div class="status-indicator">
                            <div id="statusDot" class="status-dot status-offline"></div>
                            <span id="statusText">检查中...</span>
                        </div>
                    </div>
                    
                    <div id="userInfo" class="user-info">
                        <div class="user-info-item"><strong>用户ID:</strong> <span id="userId"></span></div>
                        <div class="user-info-item"><strong>用户名:</strong> <span id="userName"></span></div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn" id="checkStatusBtn">
                        <span>↻</span> 检查登录状态
                    </button>
                    <button class="btn btn-login" id="loginBtn">
                        <span>🔑</span> 登录账号
                    </button>
                </div>
                
                <div class="history-section">
                    <div class="history-title">最近下载</div>
                    <div class="history-container">
                        <div class="history-list" id="historyList">
                            <div class="empty-history">暂无下载记录</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="message" id="message"></div>

        <script>
            class IframePanel {
                constructor() {
                    this.init();
                }

                init() {
                    this.bindEvents();
                    this.checkLoginStatus();
                }

                bindEvents() {
                    document.getElementById('closeBtn').addEventListener('click', () => {
                        this.closePanel();
                    });

                    document.getElementById('refreshBtn').addEventListener('click', () => {
                        this.checkLoginStatus();
                    });

                    document.getElementById('checkStatusBtn').addEventListener('click', () => {
                        this.checkLoginStatus();
                    });

                    document.getElementById('loginBtn').addEventListener('click', () => {
                        this.login();
                    });

                    // 监听来自父窗口的消息
                    window.addEventListener('message', (event) => {
                        this.handleParentMessage(event);
                    });
                }

                // 关闭面板
                closePanel() {
                    window.parent.postMessage({ action: 'closePanel' }, '*');
                }

                // 检查登录状态
                checkLoginStatus() {
                    window.parent.postMessage({ action: 'checkLoginStatus' }, '*');
                }

                // 登录
                login() {
                    window.parent.postMessage({ action: 'login' }, '*');
                }

                // 处理来自父窗口的消息
                handleParentMessage(event) {
                    const message = event.data;
                    
                    switch (message.action) {
                        case 'loginStatus':
                            this.updateLoginStatus(message.status);
                            break;
                        case 'userInfoUpdated':
                            this.showMessage(message.success ? '用户信息更新成功' : '更新失败', message.success);
                            if (message.success) {
                                this.checkLoginStatus();
                            }
                            break;
                        // case 'downloadStatus':
                        //     this.handleDownloadStatus(message);
                        //     break;
                        case 'downloadHistory':
                            this.updateDownloadHistory(message.history);
                            break;
                        case 'panelOpened':
                            this.checkLoginStatus();
                            break;
                    }
                }

                // 更新登录状态显示
                updateLoginStatus(status) {
                    const dot = document.getElementById('statusDot');
                    const statusText = document.getElementById('statusText');
                    const userInfo = document.getElementById('userInfo');
                    const loginBtn = document.getElementById('loginBtn');

                    if (status.isLoggedIn) {
                        dot.className = 'status-dot status-online';
                        statusText.textContent = '已登录';
                        userInfo.style.display = 'block';
                        document.getElementById('userId').textContent = status.userInfo.creationUserId || '未设置';
                        document.getElementById('userName').textContent = status.userInfo.creationUserName || '未设置';
                        loginBtn.innerHTML = '<span>🔄</span> 重新登录';
                        loginBtn.className = 'btn btn-logout';
                    } else {
                        dot.className = 'status-dot status-offline';
                        statusText.textContent = '未登录';
                        userInfo.style.display = 'none';
                        loginBtn.innerHTML = '<span>🔑</span> 登录账号';
                        loginBtn.className = 'btn btn-login';
                    }
                }

                // 处理下载状态
                // handleDownloadStatus(message) {
                //     switch (message.status) {
                //         case 'success':
                //             this.showMessage('下载成功', true);
                //             this.addToHistory(message.data);
                //             break;
                //         case 'error':
                //             this.showMessage('下载失败: ' + message.message, false);
                //             break;
                //         case 'requiresLogin':
                //             this.showMessage('请先登录', false);
                //             break;
                //     }
                // }

                // 更新下载历史
                updateDownloadHistory(history) {
                    const historyList = document.getElementById('historyList');
                    
                    if (history && history.length > 0) {
                        // 清空现有内容
                        historyList.innerHTML = '';
                        
                        // 添加历史项
                        history.forEach(item => {
                            const historyItem = document.createElement('div');
                            historyItem.className = 'history-item';
                            
                            historyItem.innerHTML = \`
                                <img src="\${item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0zMCAxOEMzNi42Mjc0IDE4IDQyIDIzLjM3MjYgNDIgMzBDNDIgMzYuNjI3NCAzNi42Mjc0IDQyIDMwIDQyQzIzLjM3MjYgNDIgMTggMzYuNjI3NCAxOCAzMEMxOCAyMy4zNzI2IDIzLjM3MjYgMTggMzAgMThaTTMwIDE1QzIxLjM0MzEgMTUgMTQgMjIuMzQzMSAxNCAzMEMxNCAzNy42NTY5IDIxLjM0MzEgNDUgMzAgNDVDMzguNjU2OSA0NSA0NiAzNy42NTY5IDQ2IDMwQzQ2IDIyLjM0MzEgMzguNjU2OSAxNSAzMCAxNVoiIGZpbGw9IiNBOUE5QTkiLz4KPHBhdGggZD0iTTM0IDI3SDIzVjM0SDI2VjMwSDM0VjI3WiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K'}" class="history-image" alt="\${item.title}">
                                <div class="history-info">
                                    <div>
                                        <span class="history-id">ID: \${item.imageId}</span>
                                        <div class="history-time">\${item.time}</div>
                                    </div>
                                </div>
                            \`;
                            
                            historyList.appendChild(historyItem);
                        });
                    } else {
                        historyList.innerHTML = '<div class="empty-history">暂无下载记录</div>';
                    }
                }

                // 添加到下载历史 - 修改为去重逻辑
                addToHistory(data) {
                    const historyList = document.getElementById('historyList');
                    
                    // 如果当前显示"暂无下载记录"，清除它
                    if (historyList.querySelector('.empty-history')) {
                        historyList.innerHTML = '';
                    }
                    
                    // 检查是否已存在相同图片ID的记录
                    const existingItems = historyList.querySelectorAll('.history-item');
                    let existingItem = null;
                    
                    for (let i = 0; i < existingItems.length; i++) {
                        const idElement = existingItems[i].querySelector('.history-id');
                        if (idElement && idElement.textContent.includes(data.imageId)) {
                            existingItem = existingItems[i];
                            break;
                        }
                    }
                    
                    // 如果已存在，更新该记录
                    if (existingItem) {
                        const timeElement = existingItem.querySelector('.history-time');
                        const imageElement = existingItem.querySelector('.history-image');
                        
                        if (timeElement) timeElement.textContent = new Date().toLocaleTimeString();
                        if (titleElement) titleElement.textContent = data.productTitle.length > 25 ? 
                            data.productTitle.substring(0, 25) + '...' : data.productTitle;
                        if (imageElement && data.imageUrl) imageElement.src = data.imageUrl;
                        
                        // 将更新的记录移到最前面
                        historyList.insertBefore(existingItem, historyList.firstChild);
                    } else {
                        // 如果不存在，创建新记录
                        const historyItem = document.createElement('div');
                        historyItem.className = 'history-item';
                        
                        const time = new Date().toLocaleTimeString();
                        const truncatedTitle = data.productTitle.length > 25 ? 
                            data.productTitle.substring(0, 25) + '...' : data.productTitle;
                        
                        historyItem.innerHTML = \`
                            <img src="\${data.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0zMCAxOEMzNi42Mjc0IDE4IDQyIDIzLjM3MjYgNDIgMzBDNDIgMzYuNjI3NCAzNi42Mjc0IDQyIDMwIDQyQzIzLjM3MjYgNDIgMTggMzYuNjI3NCAxOCAzMEMxOCAyMy4zNzI2IDIzLjM3MjYgMTggMzAgMThaTTMwIDE1QzIxLjM0MzEgMTUgMTQgMjIuMzQzMSAxNCAzMEMxNCAzNy42NTY5IDIxLjM0MzEgNDUgMzAgNDVDMzguNjU2OSA0NSA0NiAzNy42NTY5IDQ2IDMwQzQ2IDIyLjM0MzEgMzguNjU2OSAxNSAzMCAxNVoiIGZpbGw9IiNBOUE5QTkiLz4KPHBhdGggZD0iTTM0IDI3SDIzVjM0SDI2VjMwSDM0VjI3WiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K'}" class="history-image" alt="\${data.productTitle}">
                            <div class="history-info">
                                <div>
                                    <span class="history-id">ID: \${data.imageId}</span>
                                    <div class="history-time">\${time}</div>
                                </div>
                            </div>
                        \`;
                        
                        historyList.insertBefore(historyItem, historyList.firstChild);
                    }
                    
                    // 限制历史记录数量为20
                    while (historyList.children.length > 20) {
                        historyList.removeChild(historyList.lastChild);
                    }
                }

                // 显示消息
                showMessage(text, isSuccess) {
                    const messageEl = document.getElementById('message');
                    messageEl.textContent = text;
                    messageEl.style.background = isSuccess ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)';
                    messageEl.classList.add('show');
                    
                    setTimeout(() => {
                        messageEl.classList.remove('show');
                    }, 2000);
                }
            }

            // 初始化iframe面板
            new IframePanel();
        </script>
    </body>
    </html>
    `;
  }

  // 发送消息到iframe
  sendMessageToIframe(message) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  // 处理来自iframe的消息
  handleIframeMessage(event) {
    // 验证消息来源
    if (!this.iframe || event.source !== this.iframe.contentWindow) return;
    
    const message = event.data;
    
    switch (message.action) {
      case 'closePanel':
        this.hidePanel();
        break;
      case 'checkLoginStatus':
        this.checkLoginStatusForIframe();
        break;
      case 'login':
        this.redirectToLogin();
        break;
    }
  }

  // 为iframe检查登录状态
  async checkLoginStatusForIframe() {
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, (response) => {
      this.sendMessageToIframe({
        action: 'loginStatus',
        status: response
      });
      
      // 同时发送下载历史
      this.sendMessageToIframe({
        action: 'downloadHistory',
        history: this.downloadHistory
      });
    });
  }

  // 重定向到登录页面
  async redirectToLogin() {
    chrome.runtime.sendMessage({ action: 'loginRedirect' });
  }


  // 加载下载历史
  loadDownloadHistory() {
    // 这里可以从chrome.storage加载历史记录
    // 暂时使用空数组
    this.downloadHistory = [];
  }

  // 设置请求拦截器，监听图片详情请求
  setupRequestInterceptor() {
    this.interceptedData = new Map();
    
    // 保存原始的fetch方法
    const originalFetch = window.fetch;
    
    // 重写fetch方法以拦截请求
    window.fetch = async (...args) => {
      const url = args[0];
      
      if (typeof url === 'string' && (url.includes('/show/') || url.includes('/api/'))) {
        try {
          const response = await originalFetch.apply(this, args);
          const clone = response.clone();
          try {
            const data = await clone.json();
            this.interceptedData.set(url, data);
          } catch (e) {}
          return response;
        } catch (error) {
          console.error('Fetch拦截错误:', error);
          return originalFetch.apply(this, args);
        }
      }
      
      return originalFetch.apply(this, args);
    };

    // 拦截XMLHttpRequest请求
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._url = url;
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._url && (this._url.includes('/show/') || this._url.includes('/api/'))) {
        const originalOnReadyStateChange = this.onreadystatechange;
        
        this.onreadystatechange = () => {
          if (this.readyState === 4 && this.status === 200) {
            try {
              const data = JSON.parse(this.responseText);
              this.interceptedData.set(this._url, data);
            } catch (e) {}
          }
          
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(this, args);
          }
        };
      }
      
      return originalXHRSend.apply(this, args);
    };
  }

  // 设置懒加载图片观察器
  setupLazyLoadObserver() {
    // 观察图片的src变化（懒加载常见模式）
    this.lazyLoadObserver = new MutationObserver((mutations) => {
      let shouldCheckImages = false;
      
      mutations.forEach((mutation) => {
        // 检查属性变化（特别是src属性）
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'src' || mutation.attributeName === 'data-src')) {
          shouldCheckImages = true;
        }
        
        // 检查类名变化（懒加载图片加载后通常会改变类名）
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.tagName === 'IMG' && 
              (target.classList.contains('loaded') || 
               target.classList.contains('lazyloaded') ||
               !target.classList.contains('lazyload'))) {
            shouldCheckImages = true;
          }
        }
      });

      if (shouldCheckImages) {
        // 延迟检查，确保图片已加载完成
        setTimeout(() => {
          this.injectDownloadButtons();
        }, 100);
      }
    });

    // 观察所有图片元素的属性变化
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      this.lazyLoadObserver.observe(img, {
        attributes: true,
        attributeFilter: ['src', 'data-src', 'class']
      });
    });
  }

  // 注入下载按钮到图片元素
  injectDownloadButtons() {
    const imageElements = this.findImageElements();
    imageElements.forEach((imgElement, index) => {
      if (!this.hasDownloadButton(imgElement)) {
        this.addDownloadButtonToImage(imgElement, index);
        
        // 为懒加载图片添加观察
        if (this.isLazyLoadImage(imgElement)) {
          this.observeLazyLoadImage(imgElement);
        }
      }
    });
  }

  // 检查是否为懒加载图片
  isLazyLoadImage(imgElement) {
    return imgElement.classList.contains('lazyload') || 
           imgElement.hasAttribute('data-src') ||
           imgElement.src.includes('placeholder') ||
           imgElement.src.includes('loading');
  }

  // 观察懒加载图片的变化
  observeLazyLoadImage(imgElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'src' || mutation.attributeName === 'class')) {
          // 图片已加载，重新检查并注入按钮
          setTimeout(() => {
            if (this.isVisibleImage(imgElement) && !this.hasDownloadButton(imgElement)) {
              this.addDownloadButtonToImage(imgElement, 0);
            }
          }, 100);
        }
      });
    });

    observer.observe(imgElement, {
      attributes: true,
      attributeFilter: ['src', 'class']
    });
  }

  // 查找图片元素
  findImageElements() {
    const isDetailPage = window.location.href.includes('/show/');
    
    // 详情页和列表页使用不同的选择器
    const selectors = isDetailPage ? [
      // 详情页选择器
      '#page-content img',
      '.main-image img',
      '.detail img',
      '.image-viewer img',
      '.photo-viewer img',
      '.image-container img',
      '.photo-container img',
      '.image-preview img',
      '.gallery img'
    ] : [
      // 列表页选择器
      'img[src*="hellorf"]',
      'img[data-src*="hellorf"]',
      '.image-item img',
      '.photo-item img',
      '.search-result img',
      '[class*="image"] img',
      '[class*="photo"] img',
      '.card img',
      '.item img'
    ];

    const images = [];
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // 检查图片是否已加载（不是占位符）
        if (this.isRealImage(el) && this.isVisibleImage(el) && !images.includes(el)) {
          images.push(el);
        }
      });
    });

    return images;
  }

  // 检查是否为真实图片（不是占位符）
  isRealImage(imgElement) {
    const src = imgElement.src || imgElement.getAttribute('data-src') || '';
    
    // 排除常见的占位符URL
    const placeholderPatterns = [
      'placeholder',
      'loading',
      'data:image',
      'transparent',
      'blank'
    ];
    
    return !placeholderPatterns.some(pattern => src.includes(pattern)) && 
           src.length > 10; // 确保不是空或极短的URL
  }

  // 检查是否为可见图片
  isVisibleImage(imgElement) {
    // 详情页和列表页使用不同的尺寸标准
    const isDetailPage = window.location.href.includes('/show/');
    const minSize = isDetailPage ? 200 : 100; // 详情页图片通常更大
    
    return imgElement.offsetWidth > minSize && imgElement.offsetHeight > minSize;
  }

  // 检查是否已有下载按钮
  hasDownloadButton(imgElement) {
    return imgElement.parentElement.querySelector('.hellorf-download-btn') !== null;
  }

  // 添加下载按钮到图片
  addDownloadButtonToImage(imgElement, index) {
    const container = imgElement.parentElement;
    if (!container) return;

    // 确保容器有相对定位
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'hellorf-download-btn';
    downloadBtn.innerHTML = '⬇️';
    downloadBtn.title = '下载图片';
    downloadBtn.dataset.imageIndex = index;

    this.positionDownloadButton(container, downloadBtn);

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDownloadClick(imgElement, downloadBtn);
    });

    container.appendChild(downloadBtn);
  }

  // 定位下载按钮
  positionDownloadButton(container, button) {
    const isDetailPage = window.location.href.includes('/show/');
    
    if (isDetailPage) {
      // 详情页按钮样式
      button.style.position = 'absolute';
      button.style.top = '10px';
      button.style.right = '10px';
      button.style.zIndex = '1000';
      button.style.background = 'rgba(0,0,0,0.8)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '6px';
      button.style.padding = '8px 12px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '16px';
      button.style.fontWeight = 'bold';
      button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    } else {
      // 列表页按钮样式
      button.style.position = 'absolute';
      button.style.top = '10px';
      button.style.right = '10px';
      button.style.zIndex = '1000';
      button.style.background = 'rgba(0,0,0,0.7)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.padding = '5px 8px';
      button.style.cursor = 'pointer';
      button.style.fontSize = '18px';
    }
  }

  // 处理下载点击
  async handleDownloadClick(imgElement, button) {
    try {
      button.disabled = true;
      button.innerHTML = '⏳';

      const imageInfo = await this.extractImageInfo(imgElement);
      console.log('imageInfo:', imageInfo);

      if (!imageInfo) {
        this.showMessage('无法获取图片信息', 'error');
        // 通知iframe下载失败
        this.sendMessageToIframe({ 
          action: 'downloadStatus', 
          status: 'error', 
          message: '无法获取图片信息' 
        });
        button.innerHTML = '⬇️';
        button.disabled = false;
        return;
      }

      chrome.runtime.sendMessage({
        action: 'downloadImage',
        data: imageInfo
      }, (response) => {
        if (response && response.success) {
          this.showMessage('下载成功', 'success');
          // 添加到下载历史 - 修改为去重逻辑
          this.addToDownloadHistory(imageInfo, imgElement.src);
          // 通知iframe下载成功
          this.sendMessageToIframe({ 
            action: 'downloadStatus', 
            status: 'success', 
            data: {
              ...imageInfo,
              imageUrl: imgElement.src
            }
          });
        } else if (response && response.requiresLogin) {
          this.showLoginPrompt();
          // 通知iframe需要登录
          this.sendMessageToIframe({ 
            action: 'downloadStatus', 
            status: 'requiresLogin' 
          });
        } else {
          console.log(response);
          this.showMessage(response?.error || '下载失败', 'error');
          // 通知iframe下载失败
          this.sendMessageToIframe({ 
            action: 'downloadStatus', 
            status: 'error', 
            message: response?.error || '下载失败' 
          });
        }
        
        button.innerHTML = '⬇️';
        button.disabled = false;
      });

    } catch (error) {
      console.error('下载处理错误:', error);
      button.innerHTML = '⬇️';
      button.disabled = false;
      // 通知iframe下载失败
      this.sendMessageToIframe({ 
        action: 'downloadStatus', 
        status: 'error', 
        message: error.message 
      });
    }
  }

  // 添加到下载历史 - 修改为去重逻辑
  addToDownloadHistory(imageInfo, imageUrl) {
    // 检查是否已存在相同图片ID的记录
    const existingIndex = this.downloadHistory.findIndex(item => item.imageId === imageInfo.imageId);
    
    if (existingIndex !== -1) {
      // 如果已存在，更新该记录
      this.downloadHistory[existingIndex] = {
        ...imageInfo,
        imageUrl: imageUrl,
        time: new Date().toLocaleTimeString()
      };
      
      // 将更新的记录移到数组开头
      const updatedItem = this.downloadHistory.splice(existingIndex, 1)[0];
      this.downloadHistory.unshift(updatedItem);
    } else {
      // 如果不存在，创建新记录
      const historyItem = {
        ...imageInfo,
        imageUrl: imageUrl,
        time: new Date().toLocaleTimeString()
      };
      
      this.downloadHistory.unshift(historyItem);
    }
    
    // 限制历史记录数量为20
    if (this.downloadHistory.length > 20) {
      this.downloadHistory = this.downloadHistory.slice(0, 20);
    }
    
    // 发送更新后的历史记录到iframe
    this.sendMessageToIframe({
      action: 'downloadHistory',
      history: this.downloadHistory
    });
  }

  async extractImageInfo(imgElement) {
    const container = imgElement.closest('a, [class*="item"], [class*="card"], #page-content');
    console.log('container', container, container?.href);
    
    let imageId = this.extractImageIdFromUrl(container?.href || window.location.href || '');
    let title = null;

    // 详情页直接提取信息，不需要iframe
    const isDetailPage = window.location.href.includes('/show/');
    if (isDetailPage) {
      title = this.extractDetailPageTitle();
    } else {
      // 列表页使用iframe获取详情
      const detailInfo = await this.getImageDetailsBySimulatedClick(imgElement);
      console.log('detailInfo', detailInfo);
      if (detailInfo) {
        imageId = detailInfo.imageId || imageId;
        title = detailInfo.title || title;
      }
    }

    if (!imageId) {
      imageId = this.fallbackImageInfo(imgElement).imageId;
    }
    if (!title) {
      title = this.fallbackImageInfo(imgElement).productTitle;
    }

    return {
      imageId: imageId.toString(),
      productTitle: title
    };
  }

  // 提取详情页标题
  extractDetailPageTitle() {
    const titleSelectors = [
      'h1',
      '.title',
      '.product-title',
      '.image-title',
      '.photo-title',
      '[class*="title"]',
      '.detail-title',
      '.name'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim().substring(0, 200);
      }
    }
    
    // 尝试从meta标签获取标题
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle && metaTitle.getAttribute('content')) {
      return metaTitle.getAttribute('content').substring(0, 200);
    }
    
    return null;
  }

  async getImageDetailsBySimulatedClick(imgElement) {
    return new Promise((resolve) => {
      const linkElement = imgElement.closest('a');
      const targetHref = linkElement?.href || window.location.href;

      if (!targetHref || !targetHref.includes('/show/')) {
        resolve(null);
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:0;height:0;border:0;position:absolute;left:-9999px;';

      const cleanUp = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };

      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;

            const titleElement = iframeDoc.querySelector('#page-content .title');

            if (titleElement && titleElement.textContent.trim()) {
              const title = titleElement.textContent.trim();
              const imageId = this.extractImageIdFromUrl(targetHref);
              clearInterval(interval);
              cleanUp();
              resolve({ imageId, title });
            } else if (attempts > 25) {
              clearInterval(interval);
              cleanUp();
              resolve(null);
            }
          }, 200);

        } catch (error) {
          console.error("iframe 取标题出错：", error);
          cleanUp();
          resolve(null);
        }
      };

      iframe.onerror = () => {
        cleanUp();
        resolve(null);
      };

      iframe.src = targetHref;
      document.body.appendChild(iframe);
    });
  }

  // 从URL提取图片ID
  extractImageIdFromUrl(url) {
    if (!url) return null;

    const idMatch = url.match(/(?:\/|^)(hi\d+|\d+)(?:\?|$)/);
    console.log('idMatch', idMatch, url);

    if (!idMatch) return null;

    if (idMatch[1] && idMatch[1].startsWith('hi')) {
      return idMatch[1];
    }

    return idMatch ? idMatch[1] : null;
  }

  // 提取图片标题
  extractImageTitle(container, imgElement) {
    if (imgElement.alt && imgElement.alt !== '') {
      return imgElement.alt;
    }

    const titleSelectors = [
      '.title', '.name', '.description',
      '[class*="title"]', '[class*="name"]',
      'h1', 'h2', 'h3', 'h4'
    ];

    for (const selector of titleSelectors) {
      const titleElement = container ? container.querySelector(selector) : null;
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim().substring(0, 200);
      }
    }

    return null;
  }

  // 备用图片信息提取
  fallbackImageInfo(imgElement) {
    const src = imgElement.src || imgElement.getAttribute('data-src') || '';
    console.log('imgElement', imgElement);
    const imageId = src.split('/').pop().split('.')[0] || Date.now().toString();
    const title = imgElement.alt || '下载的图片';

    return {
      imageId: imageId,
      productTitle: title
    };
  }

  // 显示消息
  showMessage(message, type = 'info') {
    // 移除已存在的消息
    const existingMessage = document.querySelector('.hellorf-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'hellorf-message';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.background = type === 'error' ? '#f44336' : '#4CAF50';
    messageDiv.style.color = 'white';
    messageDiv.style.zIndex = '10000';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 3000);
  }

  // 显示登录提示
  showLoginPrompt() {
    const confirmLogin = confirm('请先登录后再下载图片。点击确定跳转到登录页面。');
    if (confirmLogin) {
      chrome.runtime.sendMessage({ action: 'loginRedirect' });
    }
  }

  // 设置Mutation Observer监听DOM变化
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldInject = true;
          
          // 为新增的图片元素添加懒加载观察
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // 元素节点
              if (node.tagName === 'IMG') {
                this.observeLazyLoadImage(node);
              } else {
                const images = node.querySelectorAll('img');
                images.forEach(img => this.observeLazyLoadImage(img));
              }
            }
          });
        }
      });

      if (shouldInject) {
        setTimeout(() => {
          this.injectDownloadButtons();
        }, 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 设置全局点击监听器
  setupGlobalClickListener() {
    document.addEventListener('click', (e) => {
      const downloadBtn = e.target.closest('.hellorf-download-btn');
      if (downloadBtn) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // 点击面板外部关闭面板
      if (this.isPanelVisible && this.iframe && 
          !this.iframe.contains(e.target) && 
          !this.panelButton.contains(e.target)) {
        this.hidePanel();
      }
    });
  }
}

// 初始化注入器
new ImageDownloadInjector();