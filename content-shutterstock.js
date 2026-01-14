// Shutterstock AI图片下载器
class ShutterstockDownloader {
  constructor() {
    this.panelButton = null;
    this.iframe = null;
    this.isPanelVisible = false;
    this.downloadHistory = [];
    this.aiImageCount = 0;
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
    console.log('[Shutterstock下载器] 启动');
    this.injectPanelButton();
    this.injectDownloadButtons();
    this.setupMutationObserver();
    this.setupIframeMessageListener();
    setTimeout(() => this.injectDownloadButtons(), 1000);
    setTimeout(() => this.injectDownloadButtons(), 2000);
    setTimeout(() => this.injectDownloadButtons(), 3000);
  }

  injectPanelButton() {
    const existingButton = document.querySelector('.shutterstock-panel-btn');
    if (existingButton) existingButton.remove();

    this.panelButton = document.createElement('button');
    this.panelButton.className = 'shutterstock-panel-btn';
    this.panelButton.innerHTML = '📁 AI图片下载器';
    this.panelButton.title = '打开下载控制面板';

    Object.assign(this.panelButton.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '10000',
      background: '#4285f4',
      color: 'white',
      border: 'none',
      borderRadius: '20px',
      padding: '10px 15px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      transition: 'all 0.3s ease'
    });

    this.panelButton.addEventListener('click', () => {
      this.togglePanel();
    });

    document.body.appendChild(this.panelButton);
  }

  togglePanel() {
    if (this.isPanelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    if (!this.iframe) {
      this.createIframe();
    }
    this.iframe.style.display = 'block';
    this.isPanelVisible = true;
    this.panelButton.innerHTML = '📁 关闭面板';
    this.panelButton.style.background = '#f44336';
    this.sendMessageToIframe({ action: 'panelOpened' });
  }

  hidePanel() {
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
    this.isPanelVisible = false;
    this.updateButtonText(this.aiImageCount);
    this.panelButton.style.background = '#4285f4';
  }

  createIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'shutterstock-control-panel';
    this.iframe.src = chrome.runtime.getURL('iframe.html');

    Object.assign(this.iframe.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '420px',
      height: '600px',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      zIndex: '9999',
      backgroundColor: 'white',
      display: 'none',
      overflow: 'hidden'
    });

    document.body.appendChild(this.iframe);
  }

  sendMessageToIframe(message) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  setupIframeMessageListener() {
    window.addEventListener('message', (event) => {
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
          chrome.runtime.sendMessage({ action: 'loginRedirect' });
          break;
      }
    });
  }

  checkLoginStatusForIframe() {
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, (response) => {
      this.sendMessageToIframe({
        action: 'loginStatus',
        status: response
      });
      this.sendMessageToIframe({
        action: 'downloadHistory',
        history: this.downloadHistory
      });
    });
  }

  updateButtonText(count) {
    console.log(count)
    // if (this.panelButton && !this.isPanelVisible) {
    //   this.panelButton.innerHTML = `📁 AI图片 (${count})`;
    // }
  }

  // 检查图片是否有AI标识
  isAIGeneratedImage(imgElement) {
    // 查找包含图片的链接元素
    const container = imgElement.closest('[class*="sstkGridItem"]') ||
                      imgElement.closest('[data-automation="AssetGrids_GridItemContainer_div"]');

    if (!container) return false;

    // 查找链接元素
    const link = container.querySelector('a[href*="image-generated"]') ||
                 container.querySelector('a[href*="/generated/"]');

    if (link) {
      console.log('[Shutterstock下载器] 通过URL检测到AI图片:', link.href);
      return true;
    }

    return false;
  }

  // 从图片元素提取信息
  extractImageInfo(imgElement) {
    const src = imgElement.src || '';
    const alt = imgElement.alt || '';

    // 从src提取imageId，格式如：xxx-600nw-2544182121.jpg
    const idMatch = src.match(/(\d{7,})/);
    const imageId = idMatch ? idMatch[1] : '';

    console.log('[Shutterstock下载器] 提取图片信息:', { src, alt, imageId });

    return {
      imageUrl: src,
      imageId: imageId,
      title: alt
    };
  }

  // 查找所有图片元素
  findAllImageElements() {
    const selectors = [
      'img[data-automation="asset-thumbnail"]',
      'img[class*="thumbnail"]',
      'img[class*="mui-"]',
      'picture img',
      '[class*="assetItemContainer"] img',
      '[data-automation="mosaic-grid-cell"] img'
    ];

    const images = new Set();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        if (img.offsetWidth > 50 && img.offsetHeight > 50 && img.src && !img.src.includes('data:')) {
          images.add(img);
        }
      });
    });

    console.log('[Shutterstock下载器] 找到图片总数:', images.size);
    return Array.from(images);
  }

  // 查找AI图片元素
  findAIImageElements() {
    const allImages = this.findAllImageElements();
    const aiImages = allImages.filter(img => this.isAIGeneratedImage(img));
    console.log('[Shutterstock下载器] AI图片数量:', aiImages.length);
    this.aiImageCount = aiImages.length;
    return aiImages;
  }

  hasDownloadButton(imgElement) {
    // 只检查图片的直接容器是否已有下载按钮
    const container = imgElement.closest('[class*="assetItemContainer"]') ||
                      imgElement.closest('[class*="letterboxingWrapper"]')?.parentElement ||
                      imgElement.parentElement?.parentElement;
    if (!container) return false;
    return container.querySelector('.shutterstock-download-btn') !== null;
  }

  injectDownloadButtons() {
    const imageElements = this.findAIImageElements();
    let injectedCount = 0;

    imageElements.forEach(imgElement => {
      if (!this.hasDownloadButton(imgElement)) {
        this.addDownloadButtonToImage(imgElement);
        injectedCount++;
      }
    });

    if (injectedCount > 0) {
      console.log('[Shutterstock下载器] 注入下载按钮数量:', injectedCount);
    }

    this.updateButtonText(imageElements.length);
  }

  addDownloadButtonToImage(imgElement) {
    // 查找合适的容器
    let container = imgElement.closest('[class*="assetItemContainer"]') ||
                    imgElement.closest('[class*="letterboxingWrapper"]')?.parentElement;

    if (!container) {
      container = imgElement.parentElement?.parentElement;
    }

    if (!container) return;

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'shutterstock-download-btn';
    downloadBtn.innerHTML = '⬇️ AI';
    downloadBtn.title = '下载AI图片';

    Object.assign(downloadBtn.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: '9999',
      background: 'rgba(66, 133, 244, 0.95)',
      color: 'white',
      border: '2px solid white',
      borderRadius: '6px',
      padding: '6px 12px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    });

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDownloadClick(imgElement, downloadBtn);
    });

    downloadBtn.addEventListener('mouseenter', () => {
      downloadBtn.style.background = 'rgba(66, 133, 244, 1)';
      downloadBtn.style.transform = 'scale(1.05)';
    });

    downloadBtn.addEventListener('mouseleave', () => {
      downloadBtn.style.background = 'rgba(66, 133, 244, 0.95)';
      downloadBtn.style.transform = 'scale(1)';
    });

    container.appendChild(downloadBtn);
  }

  async handleDownloadClick(imgElement, button) {
    try {
      button.disabled = true;
      button.innerHTML = '⏳';

      const imageInfo = this.extractImageInfo(imgElement);

      if (!imageInfo.imageId) {
        this.showMessage('无法获取图片ID', 'error');
        button.innerHTML = '⬇️ AI';
        button.disabled = false;
        return;
      }

      chrome.runtime.sendMessage({
        action: 'downloadShutterstockImage',
        data: imageInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Shutterstock下载器] 消息发送错误:', chrome.runtime.lastError);
          this.showMessage('插件通信错误', 'error');
          button.innerHTML = '⬇️ AI';
          button.disabled = false;
          return;
        }

        if (response && response.success) {
          this.showMessage('下载成功', 'success');
          button.innerHTML = '✅';
          button.style.background = 'rgba(76, 175, 80, 0.95)';
          this.addToDownloadHistory(imageInfo, imgElement.src);
        } else if (response && response.requiresLogin) {
          this.showLoginPrompt();
          button.innerHTML = '⬇️ AI';
        } else {
          this.showMessage(response?.error || '下载失败', 'error');
          button.innerHTML = '⬇️ AI';
        }
        button.disabled = false;
      });

    } catch (error) {
      console.error('[Shutterstock下载器] 下载处理错误:', error);
      button.innerHTML = '⬇️ AI';
      button.disabled = false;
    }
  }

  showMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.shutterstock-message');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'shutterstock-message';
    messageDiv.textContent = message;

    Object.assign(messageDiv.style, {
      position: 'fixed',
      top: '70px',
      right: '20px',
      padding: '12px 20px',
      background: type === 'error' ? '#f44336' : '#4CAF50',
      color: 'white',
      zIndex: '10001',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    });

    document.body.appendChild(messageDiv);
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, 3000);
  }

  showLoginPrompt() {
    const confirmLogin = confirm('请先登录后再下载图片。点击确定跳转到登录页面。');
    if (confirmLogin) {
      chrome.runtime.sendMessage({ action: 'loginRedirect' });
    }
  }

  addToDownloadHistory(imageInfo, imageUrl) {
    const existingIndex = this.downloadHistory.findIndex(item => item.imageId === imageInfo.imageId);

    if (existingIndex !== -1) {
      this.downloadHistory.splice(existingIndex, 1);
    }

    this.downloadHistory.unshift({
      ...imageInfo,
      imageUrl: imageUrl,
      time: new Date().toLocaleTimeString()
    });

    if (this.downloadHistory.length > 20) {
      this.downloadHistory = this.downloadHistory.slice(0, 20);
    }

    this.sendMessageToIframe({
      action: 'downloadHistory',
      history: this.downloadHistory
    });
  }

  setupMutationObserver() {
    let debounceTimer = null;

    const observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.tagName === 'IMG' || node.querySelector?.('img'))) {
              shouldInject = true;
            }
          });
        }
      });

      if (shouldInject) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.injectDownloadButtons(), 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// 确保脚本正确初始化
console.log('[Shutterstock下载器] 脚本加载');
new ShutterstockDownloader();
