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
    this.imagePlugTypes = [];
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
    this.loadImagePlugTypes(); // 初始化时获取类型列表
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

  // 加载图片类型列表
  loadImagePlugTypes() {
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, (response) => {
      if (response && response.userInfo && response.userInfo.imagePlugTypes) {
        this.imagePlugTypes = response.userInfo.imagePlugTypes;
        this.updateAllSelectOptions();
      }
    });
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
    this.panelButton.innerHTML = '📁 图片下载器';
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
    this.panelButton.innerHTML = '📁 图片下载器';
    this.panelButton.style.background = '#4285f4';
  }

  // 创建iframe 
  createIframe() {
    this.iframe = document.createElement('iframe');
    console.log('121行iframe',this.iframe)
    this.iframe.id = 'hellorf-control-panel';
    this.iframe.src = chrome.runtime.getURL('iframe.html');
    
    // 设置iframe样式
    this.iframe.style.position = 'fixed';
    this.iframe.style.top = '60px';
    this.iframe.style.right = '20px';
    this.iframe.style.width = '420px';
    this.iframe.style.height = '950px';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '12px';
    this.iframe.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
    this.iframe.style.zIndex = '9999';
    this.iframe.style.backgroundColor = 'white';
    this.iframe.style.display = 'none';
    this.iframe.style.overflow = 'hidden';
    document.body.appendChild(this.iframe);
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
      // 存储 imagePlugTypes
      if (response.userInfo && response.userInfo.imagePlugTypes) {
        this.imagePlugTypes = response.userInfo.imagePlugTypes;
        this.updateAllSelectOptions();
      }

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

  // 更新所有下拉选择框的选项
  updateAllSelectOptions() {
    const selects = document.querySelectorAll('.hellorf-type-select');
    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">请选择类型</option>';
      this.imagePlugTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.key;
        option.textContent = type.value;
        select.appendChild(option);
      });
      if (currentValue) {
        select.value = currentValue;
      }
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
    this.lazyLoadObserver = new MutationObserver((mutations) => {
      let shouldCheckImages = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'src' || mutation.attributeName === 'data-src')) {
          shouldCheckImages = true;
        }
        
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
        setTimeout(() => {
          this.injectDownloadButtons();
        }, 100);
      }
    });

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
    
    const selectors = isDetailPage ? [
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
    
    const placeholderPatterns = [
      'placeholder',
      'loading',
      'data:image',
      'transparent',
      'blank'
    ];
    
    return !placeholderPatterns.some(pattern => src.includes(pattern)) && 
           src.length > 10;
  }

  // 检查是否为可见图片
  isVisibleImage(imgElement) {
    const isDetailPage = window.location.href.includes('/show/');
    const minSize = isDetailPage ? 200 : 100;
    
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

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    // 创建包装容器
    const wrapper = document.createElement('div');
    wrapper.className = 'hellorf-download-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.top = '10px';
    wrapper.style.right = '10px';
    wrapper.style.zIndex = '1000';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '5px';

    // 创建下拉选择框
    const typeSelect = document.createElement('select');
    typeSelect.className = 'hellorf-type-select';
    typeSelect.dataset.imageIndex = index;
    typeSelect.innerHTML = '<option value="">请选择类型</option>';

    // 填充选项
    this.imagePlugTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type.key;
      option.textContent = type.value;
      typeSelect.appendChild(option);
    });

    this.styleTypeSelect(typeSelect);

    typeSelect.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'hellorf-download-btn';
    downloadBtn.innerHTML = '⬇️';
    downloadBtn.title = '下载图片';
    downloadBtn.dataset.imageIndex = index;

    this.styleDownloadButton(downloadBtn);

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDownloadClick(imgElement, downloadBtn, typeSelect);
    });

    wrapper.appendChild(typeSelect);
    wrapper.appendChild(downloadBtn);
    container.appendChild(wrapper);
  }

  // 样式化下拉选择框
  styleTypeSelect(select) {
    select.style.background = 'rgba(0,0,0,0.7)';
    select.style.color = 'white';
    select.style.border = 'none';
    select.style.borderRadius = '4px';
    select.style.padding = '5px 8px';
    select.style.cursor = 'pointer';
    select.style.fontSize = '12px';
    select.style.maxWidth = '120px';
    select.style.outline = 'none';
  }

  // 样式化下载按钮
  styleDownloadButton(button) {
    button.style.background = 'rgba(0,0,0,0.7)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.padding = '5px 8px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '18px';
  }

  // 定位下载按钮
  positionDownloadButton(container, button) {
    const isDetailPage = window.location.href.includes('/show/');
    
    if (isDetailPage) {
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
  async handleDownloadClick(imgElement, button, typeSelect) {
    try {
      // 检查是否选择了类型
      const plugType = typeSelect ? typeSelect.value : '';
      if (!plugType) {
        this.showMessage('请先选择类型', 'error');
        return;
      }

      button.disabled = true;
      button.innerHTML = '⏳';

      const imageInfo = await this.extractImageInfo(imgElement);
      console.log('imageInfo:', imageInfo);

      if (!imageInfo) {
        this.showMessage('无法获取图片信息', 'error');
        this.sendMessageToIframe({
          action: 'downloadStatus',
          status: 'error',
          message: '无法获取图片信息'
        });
        button.innerHTML = '⬇️';
        button.disabled = false;
        return;
      }

      // 添加 plugType 到 imageInfo
      imageInfo.plugType = plugType;

      chrome.runtime.sendMessage({
        action: 'downloadImage',
        data: imageInfo
      }, (response) => {
        if (response && response.success) {
          this.showMessage('下载成功', 'success');
          this.addToDownloadHistory(imageInfo, imgElement.src);
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
          this.sendMessageToIframe({ 
            action: 'downloadStatus', 
            status: 'requiresLogin' 
          });
        } else {
          console.log(response);
          this.showMessage(response?.error || '下载失败', 'error');
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
      this.sendMessageToIframe({ 
        action: 'downloadStatus', 
        status: 'error', 
        message: error.message 
      });
    }
  }

  // 添加到下载历史 - 去重
  addToDownloadHistory(imageInfo, imageUrl) {
    const existingIndex = this.downloadHistory.findIndex(item => item.imageId === imageInfo.imageId);
    
    if (existingIndex !== -1) {
      this.downloadHistory[existingIndex] = {
        ...imageInfo,
        imageUrl: imageUrl,
        time: new Date().toLocaleTimeString()
      };
      
      const updatedItem = this.downloadHistory.splice(existingIndex, 1)[0];
      this.downloadHistory.unshift(updatedItem);
    } else {
      const historyItem = {
        ...imageInfo,
        imageUrl: imageUrl,
        time: new Date().toLocaleTimeString()
      };
      
      this.downloadHistory.unshift(historyItem);
    }
    
    if (this.downloadHistory.length > 20) {
      this.downloadHistory = this.downloadHistory.slice(0, 20);
    }
    
    this.sendMessageToIframe({
      action: 'downloadHistory',
      history: this.downloadHistory
    });
  }
  // 获取点击图片的模块信息
  async extractImageInfo(imgElement) {
    const container = imgElement.closest('a, [class*="item"], [class*="card"], #page-content');
    console.log('container', container, container?.href);
    
    let imageId = this.extractImageIdFromUrl(container?.href || window.location.href || '');
    let title = null;

    const isDetailPage = window.location.href.includes('/show/');
    if (isDetailPage) {
      title = this.extractDetailPageTitle();
    } else {
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
          
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
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