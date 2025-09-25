// 内容脚本 - 注入到Hellorf图片列表页和详情页
class ImageDownloadInjector {
  constructor() {
    this.observer = null;
    this.requestInterceptor = null;
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
    this.injectDownloadButtons();
    this.injectDownloadButtonForDetailPage(); // 新增：详情页注入
    this.setupMutationObserver();
    this.setupGlobalClickListener();
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

  // 注入下载按钮到列表页图片
  injectDownloadButtons() {
    const imageElements = this.findImageElements();
    imageElements.forEach((imgElement, index) => {
      if (!this.hasDownloadButton(imgElement)) {
        this.addDownloadButtonToImage(imgElement, index);
      }
    });
  }

  // 新增：注入下载按钮到详情页主图
  injectDownloadButtonForDetailPage() {
    const detailSelectors = [
      '#page-content img',
      '.main-image img',
      '.detail img'
    ];
    let detailImg = null;

    for (const selector of detailSelectors) {
      const el = document.querySelector(selector);
      if (el && this.isVisibleImage(el)) {
        detailImg = el;
        break;
      }
    }

    if (detailImg && !this.hasDownloadButton(detailImg)) {
      this.addDownloadButtonToImage(detailImg, 0);
    }
  }

  // 查找列表页图片元素
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
    button.style.fontSize = '18px';
  }

  // 处理下载点击
  async handleDownloadClick(imgElement, button) {
    try {
      button.disabled = true;
      button.innerHTML = '⏳';

      const imageInfo = await this.extractImageInfo(imgElement);
      console.log('183行imageInfo:', imageInfo);

      if (!imageInfo) {
        this.showMessage('无法获取图片信息', 'error');
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
        } else if (response && response.requiresLogin) {
          this.showLoginPrompt();
        } else {
          console.log(response);
          this.showMessage(response?.error || '下载失败', 'error');
        }
        
        button.innerHTML = '⬇️';
        button.disabled = false;
      });

    } catch (error) {
      console.error('下载处理错误:', error);
      button.innerHTML = '⬇️';
      button.disabled = false;
    }
  }

  async extractImageInfo(imgElement) {
    const container = imgElement.closest('a, [class*="item"], [class*="card"], #page-content');
    console.log('218行container', container, container?.href);
    let imageId = this.extractImageIdFromUrl(container?.href || window.location.href || '');
    let title = null;

    const detailInfo = await this.getImageDetailsBySimulatedClick(imgElement);
    console.log('222行detailInfo', detailInfo);
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

  async getImageDetailsBySimulatedClick(imgElement) {
    return new Promise((resolve) => {
      const linkElement = imgElement.closest('a');
      const targetHref = linkElement?.href || window.location.href;

      if (!targetHref) {
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
    console.log('308行idMatch', idMatch, url);

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
    const src = imgElement.src;
    console.log('335行imgElement', imgElement);
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
    messageDiv.style.top = '10vh';
    messageDiv.style.right = '45vw';
    messageDiv.style.padding = '10px 15px';
    messageDiv.style.background = type === 'error' ? '#f44336' : '#4CAF50';
    messageDiv.style.color = 'white';
    messageDiv.style.zIndex = '10000';
    messageDiv.style.borderRadius = '4px';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 1000);
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
          this.injectDownloadButtonForDetailPage(); // DOM 变化时也尝试注入详情页按钮
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
    });
  }
}

// 初始化注入器
new ImageDownloadInjector();
