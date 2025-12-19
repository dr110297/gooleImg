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
            historyList.innerHTML = '';
            
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                historyItem.innerHTML = `
                    <img src="${item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0zMCAxOEMzNi42Mjc0IDE4IDQyIDIzLjM3MjYgNDIgMzBDNDIgMzYuNjI3NCAzNi42Mjc0IDQyIDMwIDQyQzIzLjM3MjYgNDIgMTggMzYuNjI3NCAxOCAzMEMxOCAyMy4zNzI2IDIzLjM3MjYgMTggMzAgMThaTTMwIDE1QzIxLjM0MzEgMTUgMTQgMjIuMzQzMSAxNCAzMEMxNCAzNy42NTY5IDIxLjM0MzEgNDUgMzAgNDVDMzguNjU2OSA0NSA0NiAzNy42NTY5IDQ2IDMwQzQ2IDIyLjM0MzEgMzguNjU2OSAxNSAzMCAxNVoiIGZpbGw9IiNBOUE5QTkiLz4KPHBhdGggZD0iTTM0IDI3SDIzVjM0SDI2VjMwSDM0VjI3WiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K'}" class="history-image" alt="${item.title}">
                    <div class="history-info">
                        <div>
                            <span class="history-id">ID: ${item.imageId}</span>
                            <div class="history-time">${item.time}</div>
                        </div>
                    </div>
                `;
                
                historyList.appendChild(historyItem);
            });
        } else {
            historyList.innerHTML = '<div class="empty-history">暂无下载记录</div>';
        }
    }

    // 添加到下载历史 - 修改为去重逻辑
    addToHistory(data) {
        const historyList = document.getElementById('historyList');
        
        if (historyList.querySelector('.empty-history')) {
            historyList.innerHTML = '';
        }
        
        const existingItems = historyList.querySelectorAll('.history-item');
        let existingItem = null;
        
        for (let i = 0; i < existingItems.length; i++) {
            const idElement = existingItems[i].querySelector('.history-id');
            if (idElement && idElement.textContent.includes(data.imageId)) {
                existingItem = existingItems[i];
                break;
            }
        }
        
        if (existingItem) {
            const timeElement = existingItem.querySelector('.history-time');
            const imageElement = existingItem.querySelector('.history-image');
            
            if (timeElement) timeElement.textContent = new Date().toLocaleTimeString();
            if (imageElement && data.imageUrl) imageElement.src = data.imageUrl;
            
            historyList.insertBefore(existingItem, historyList.firstChild);
        } else {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const time = new Date().toLocaleTimeString();
            const truncatedTitle = data.productTitle.length > 25 ? 
                data.productTitle.substring(0, 25) + '...' : data.productTitle;
            
            historyItem.innerHTML = `
                <img src="${data.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0zMCAxOEMzNi42Mjc0IDE4IDQyIDIzLjM3MjYgNDIgMzBDNDIgMzYuNjI3NCAzNi42Mjc0IDQyIDMwIDQyQzIzLjM3MjYgNDIgMTggMzYuNjI3NCAxOCAzMEMxOCAyMy4zNzI2IDIzLjM3MjYgMTggMzAgMThaTTMwIDE1QzIxLjM0MzEgMTUgMTQgMjIuMzQzMSAxNCAzMEMxNCAzNy42NTY5IDIxLjM0MzEgNDUgMzAgNDVDMzguNjU2OSA0NSA0NiAzNy42NTY5IDQ2IDMwQzQ2IDIyLjM0MzEgMzguNjU2OSAxNSAzMCAxNVoiIGZpbGw9IiNBOUE5QTkiLz4KPHBhdGggZD0iTTM0IDI3SDIzVjM0SDI2VjMwSDM0VjI3WiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K'}" class="history-image" alt="${data.productTitle}">
                <div class="history-info">
                    <div>
                        <span class="history-id">ID: ${data.imageId}</span>
                        <div class="history-time">${time}</div>
                    </div>
                </div>
            `;
            
            historyList.insertBefore(historyItem, historyList.firstChild);
        }
        
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