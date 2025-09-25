// iframe内部逻辑
class IframePanel {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkLoginStatus();
    
    // 通知父窗口iframe已加载完成
    window.parent.postMessage({ action: 'iframeLoaded' }, '*');
  }

  bindEvents() {
    document.getElementById('closeBtn').addEventListener('click', () => {
      this.closePanel();
    });

    document.getElementById('checkStatusBtn').addEventListener('click', () => {
      this.checkLoginStatus();
    });

    document.getElementById('loginBtn').addEventListener('click', () => {
      this.login();
    });

    // document.getElementById('updateUserBtn').addEventListener('click', () => {
    //   this.updateUserInfo();
    // });

    // 监听来自父窗口的消息
    window.addEventListener('message', (event) => {
      this.handleParentMessage(event);
    });
  }

  // 关闭
  closePanel() {
    window.parent.postMessage({ action: 'closePanel' }, '*');
  }

  // 登录
  login() {
    window.parent.postMessage({ action: 'login' }, '*');
  }

  // 检查登录状态
  checkLoginStatus() {
    window.parent.postMessage({ action: 'checkLoginStatus' }, '*');
  }

  // 更新用户信息
//   updateUserInfo() {
//     const userId = prompt('请输入用户ID:');
//     const userName = prompt('请输入用户名:');
    
//     if (userId && userName) {
//       window.parent.postMessage({ 
//         action: 'updateUserInfo', 
//         userInfo: {
//           creationUserId: userId,
//           creationUserName: userName
//         }
//       }, '*');
//     }
//   }

  // 处理来自父窗口消息
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
      case 'panelOpened':
        this.checkLoginStatus();
        break;
    }
  }

  // 更新登录状态显示
  updateLoginStatus(status) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');

    if (status.isLoggedIn) {
      indicator.className = 'status-indicator status-online';
      statusText.textContent = '已登录';
      userInfo.classList.remove('hidden');
      document.getElementById('userId').textContent = status.userInfo.creationUserId || '未设置';
      document.getElementById('userName').textContent = status.userInfo.creationUserName || '未设置';
      loginBtn.textContent = '重新登录';
      loginBtn.classList.remove('btn-login');
    } else {
      indicator.className = 'status-indicator status-offline';
      statusText.textContent = '未登录';
      userInfo.classList.add('hidden');
      loginBtn.textContent = '登录账号';
      loginBtn.classList.add('btn-login');
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
  
  // 添加到下载历史
  addToHistory(data) {
    const historyList = document.getElementById('historyList');
    const historyItem = document.createElement('div'); 
    historyItem.className = 'history-item';
    
    const time = new Date().toLocaleTimeString();
    historyItem.textContent = `${time} - ${data.productTitle.substring(0, 30)}...`;
    
    // 如果第一条是"暂无下载记录"，移除它
    if (historyList.firstChild.textContent === '暂无下载记录') {
      historyList.innerHTML = '';
    }
    
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    // 限制历史记录数量
    if (historyList.children.length > 10) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  // 显示消息
  showMessage(text, isSuccess) {
    // 这里可以实现更美观的消息提示
    alert(text);
  }
}

// 初始化iframe面板
new IframePanel();