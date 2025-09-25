// 内容脚本 - 注入到Hellorf图片列表页，使用内嵌iframe控制面板
class ImageDownloadInjector {
    constructor() {
        this.observer = null;
        this.requestInterceptor = null;
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
        this.setupGlobalClickListener();
        this.loadDownloadHistory();
        
        // 监听来自iframe的消息
        window.addEventListener('message', (event) => {
            this.handleIframeMessage(event);
        });
    }

    // 注入控制面板按钮
    injectPanelButton() {
        if (document.querySelector('.hellorf-panel-btn')) return;

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
        
        // 设置iframe样式
        this.iframe.style.position = 'fixed';
        this.iframe.style.top = '60px';
        this.iframe.style.right = '20px';
        this.iframe.style.width = '380px';
        this.iframe.style.height = '520px';
        this.iframe.style.border = 'none';
        this.iframe.style.borderRadius = '12px';
        this.iframe.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
        this.iframe.style.zIndex = '9999';
        this.iframe.style.backgroundColor = 'white';
        this.iframe.style.display = 'none';
        
        document.body.appendChild(this.iframe);
    }

    // 生成iframe HTML内容
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
                
                body {
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
                }
                
                .header-title {
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .header-controls {
                    display: flex;
                    gap: 10px;
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
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }
                
                .status-section {
                    background: white;
                    padding: 15px 20px;
                    border-bottom: 1px solid #eee;
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
                    overflow-y: auto;
                }
                
                .history-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #555;
                    margin-bottom: 12px;
                }
                
                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .history-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    transition: all 0.3s;
                }
                
                .history-item:hover {
                    background: #e9ecef;
                    transform: translateY(-2px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .history-image {
                    width: 50px;
                    height: 50px;
                    border-radius: 6px;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                
                .history-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .history-title-text {
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .history-time {
                    font-size: 11px;
                    color: #777;
                }
                
                .empty-history {
                    text-align: center;
                    padding: 30px 0;
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
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    z-index: 100;
                    opacity: 0;
                    transition: opacity 0.3s;
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
                        <button class="icon-btn" id="refreshBtn" title="刷新">↻</button>
                        <button class="icon-btn" id="closeBtn" title="关闭">×</button>
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
                        <button class="btn" id="updateUserBtn">
                            <span>👤</span> 设置用户信息
                        </button>
                    </div>
                    
                    <div class="history-section">
                        <div class="history-title">最近下载</div>
                        <div class="history-list" id="historyList">
                            <div class="empty-history">暂无下载记录</div>
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

                        document.getElementById('updateUserBtn').addEventListener('click', () => {
                            this.updateUserInfo();
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

                    // 更新用户信息
                    updateUserInfo() {
                        const userId = prompt('请输入用户ID:');
                        const userName = prompt('请输入用户名:');
                        
                        if (userId && userName) {
                            window.parent.postMessage({ 
                                action: 'updateUserInfo', 
                                userInfo: {
                                    creationUserId: userId,
                                    creationUserName: userName
                                }
                            }, '*');
                        }
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
                            case 'downloadStatus':
                                this.handleDownloadStatus(message);
                                break;
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
                    handleDownloadStatus(message) {
                        switch (message.status) {
                            case 'success':
                                this.showMessage('下载成功', true);
                                this.addToHistory(message.data);
                                break;
                            case 'error':
                                this.showMessage('下载失败: ' + message.message, false);
                                break;
                            case 'requiresLogin':
                                this.showMessage('请先登录', false);
                                break;
                        }
                    }

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
                                    <img src="\${item.imageUrl || 'https://via.placeholder.com/50'}" class="history-image" alt="\${item.title}">
                                    <div class="history-info">
                                        <div class="history-title-text">\${item.title}</div>
                                        <div class="history-time">\${item.time}</div>
                                    </div>
                                \`;
                                
                                historyList.appendChild(historyItem);
                            });
                        } else {
                            historyList.innerHTML = '<div class="empty-history">暂无下载记录</div>';
                        }
                    }

                    // 添加到下载历史
                    addToHistory(data) {
                        const historyList = document.getElementById('historyList');
                        
                        // 如果当前显示"暂无下载记录"，清除它
                        if (historyList.querySelector('.empty-history')) {
                            historyList.innerHTML = '';
                        }
                        
                        const historyItem = document.createElement('div');
                        historyItem.className = 'history-item';
                        
                        const time = new Date().toLocaleTimeString();
                        const truncatedTitle = data.productTitle.length > 25 ? 
                            data.productTitle.substring(0, 25) + '...' : data.productTitle;
                        
                        historyItem.innerHTML = \`
                            <img src="\${data.imageUrl || 'https://via.placeholder.com/50'}" class="history-image" alt="\${data.productTitle}">
                            <div class="history-info">
                                <div class="history-title-text">\${truncatedTitle}</div>
                                <div class="history-time">\${time}</div>
                            </div>
                        \`;
                        
                        historyList.insertBefore(historyItem, historyList.firstChild);
                        
                        // 限制历史记录数量
                        if (historyList.children.length > 10) {
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
            case 'updateUserInfo':
                this.updateUserInfoFromIframe(message.userInfo);
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

    // 从iframe更新用户信息
    async updateUserInfoFromIframe(userInfo) {
        chrome.runtime.sendMessage({
            action: 'updateUserInfo',
            userInfo: userInfo
        }, (response) => {
            this.sendMessageToIframe({
                action: 'userInfoUpdated',
                success: response.success
            });
        });
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
            
            // 拦截图片详情请求（根据Hellorf的API模式调整）
            if (typeof url === 'string' && (url.includes('/show/') || url.includes('/api/'))) {
                try {
                    const response = await originalFetch.apply(this, args);
                    const clone = response.clone();
                    
                    // 尝试解析响应数据
                    try {
                        const data = await clone.json();
                        this.interceptedData.set(url, data);
                    } catch (e) {
                        // 如果不是JSON响应，忽略
                    }
                    
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
                        } catch (e) {
                            // 解析失败，忽略
                        }
                    }
                    
                    if (originalOnReadyStateChange) {
                        originalOnReadyStateChange.apply(this, args);
                    }
                };
            }
            
            return originalXHRSend.apply(this, args);
        };
    }

    // 注入下载按钮到图片元素 
    injectDownloadButtons() {
        const imageElements = this.findImageElements();
        
        imageElements.forEach((imgElement, index) => {
            if (!this.hasDownloadButton(imgElement)) {
                this.addDownloadButtonToImage(imgElement, index);
            }
        });
    }

    // 查找图片元素
    findImageElements() {
        const selectors = [
            'img[src*="hellorf"]',
            '.image-item img',
            '.photo-item img',
            '.search-result img',
            '[class*="image"] img',
            '[class*="photo"] img'
        ];

        const images = [];
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (this.isVisibleImage(el) && !images.includes(el)) {
                    images.push(el);
                }
            });
        });

        return images;
    }

    // 检查是否为可见图片
    isVisibleImage(imgElement) {
        return imgElement.offsetWidth > 100 && imgElement.offsetHeight > 100;
    }

    // 检查是否已有下载按钮
    hasDownloadButton(imgElement) {
        return imgElement.parentElement.querySelector('.hellorf-download-btn') !== null;
    }

    // 添加下载按钮到图片
    addDownloadButtonToImage(imgElement, index) {
        const container = imgElement.parentElement;
        if (!container) return;

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

        container.style.position = 'relative';
        container.appendChild(downloadBtn);
    }

    // 定位下载按钮
    positionDownloadButton(container, button) {
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
        button.style.fontSize = '14px';
        button.style.transition = 'all 0.3s ease';
    }

    // 处理下载点击（修改：添加状态通知到iframe）
    async handleDownloadClick(imgElement, button) {
        try {
            button.disabled = true;
            button.innerHTML = '⏳';

            // 获取图片信息
            const imageInfo = await this.extractImageInfo(imgElement);
            
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

            // 发送下载请求
            chrome.runtime.sendMessage({
                action: 'downloadImage',
                data: imageInfo
            }, (response) => {
                if (response && response.success) {
                    this.showMessage('下载成功', 'success');
                    
                    // 添加到下载历史
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

    // 添加到下载历史
    addToDownloadHistory(imageInfo, imageUrl) {
        const historyItem = {
            ...imageInfo,
            imageUrl: imageUrl,
            time: new Date().toLocaleTimeString()
        };
        
        this.downloadHistory.unshift(historyItem);
        
        // 限制历史记录数量
        if (this.downloadHistory.length > 10) {
            this.downloadHistory.pop();
        }
        
        // 发送更新后的历史记录到iframe
        this.sendMessageToIframe({
            action: 'downloadHistory',
            history: this.downloadHistory
        });
    }

    // 提取图片信息 - 通过iframe获取详情页标题
    async extractImageInfo(imgElement) {
        const container = imgElement.closest('a, [class*="item"], [class*="card"]');
        let imageId = this.extractImageIdFromUrl(container?.href || '');
        let title = null;

        // 强制用详情页iframe的标题
        const detailInfo = await this.getImageDetailsBySimulatedClick(imgElement);
        if (detailInfo) {
            imageId = detailInfo.imageId || imageId;
            title = detailInfo.title || title;
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

    // 通过模拟点击获取图片详情 
    async getImageDetailsBySimulatedClick(imgElement) {
        return new Promise((resolve) => {
            const linkElement = imgElement.closest('a');
            if (!linkElement || !linkElement.href) {
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

                        // 这里允许多层级查找title
                        const titleElement = iframeDoc.querySelector('#page-content .title');

                        if (titleElement && titleElement.textContent.trim()) {
                            const title = titleElement.textContent.trim();
                            const imageId = this.extractImageIdFromUrl(linkElement.href);
                            clearInterval(interval);
                            cleanUp();
                            resolve({ imageId, title });
                        } else if (attempts > 25) { // 最多等25次（5s）
                            clearInterval(interval);
                            cleanUp();
                            console.warn("未能在iframe中获取到标题，使用fallback");
                            resolve(null);
                        }
                    }, 200);

                } catch (error) {
                    console.error("iframe取标题出错：", error);
                    cleanUp();
                    resolve(null);
                }
            };

            iframe.onerror = () => {
                cleanUp();
                resolve(null);
            };

            iframe.src = linkElement.href;
            document.body.appendChild(iframe);
        });
    }

    // 从URL提取图片ID
    extractImageIdFromUrl(url) {
        if (!url) return null;
        
        // 匹配Hellorf图片ID模式（如2486311943）
        const idMatch = url.match(/\/(\d+)(?:\?|$)/);
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
        const src = imgElement.src;
        const imageId = src.split('/').pop().split('.')[0] || Date.now().toString();
        const title = imgElement.alt || '下载的图片';

        return {
            imageId: imageId,
            productTitle: title
        };
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.padding = '10px 15px';
        messageDiv.style.background = type === 'error' ? '#f44336' : '#4CAF50';
        messageDiv.style.color = 'white';
        messageDiv.style.zIndex = '10000';
        messageDiv.style.borderRadius = '4px';
        messageDiv.style.fontSize = '14px';
        
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