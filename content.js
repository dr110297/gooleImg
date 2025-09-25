// 内容脚本 - 注入到Hellorf图片列表页和详情页
class ImageDownloadInjector {
  constructor() {
    this.observer = null;
    this.requestInterceptor = null;
    this.lazyLoadObserver = null; // 新增：懒加载观察器
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
    this.injectDownloadButtonForDetailPage();
    this.setupMutationObserver();
    this.setupLazyLoadObserver(); // 新增：设置懒加载观察器
    this.setupGlobalClickListener();
    
    // 延迟检查，确保所有图片都有机会加载
    setTimeout(() => {
      this.injectDownloadButtons();
      this.injectDownloadButtonForDetailPage();
    }, 1000);
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

  // 新增：设置懒加载图片观察器
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
          this.injectDownloadButtonForDetailPage();
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

  // 注入下载按钮到列表页图片
  injectDownloadButtons() {
    const imageElements = this.findImageElements();
    imageElements.forEach((imgElement, index) => {
      if (!this.hasDownloadButton(imgElement)) {
        this.addDownloadButtonToImage(imgElement, index);
        
        // 新增：为懒加载图片添加观察
        if (this.isLazyLoadImage(imgElement)) {
          this.observeLazyLoadImage(imgElement);
        }
      }
    });
  }

  // 新增：检查是否为懒加载图片
  isLazyLoadImage(imgElement) {
    return imgElement.classList.contains('lazyload') || 
           imgElement.hasAttribute('data-src') ||
           imgElement.src.includes('placeholder') ||
           imgElement.src.includes('loading');
  }

  // 新增：观察懒加载图片的变化
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

  // 注入下载按钮到详情页主图
  injectDownloadButtonForDetailPage() {
    const detailSelectors = [
      '#page-content img',
      '.main-image img',
      '.detail img',
      '.image-viewer img',
      '.photo-viewer img',
      '.image-container img',
      '.photo-container img'
    ];
    let detailImg = null;

    for (const selector of detailSelectors) {
      const el = document.querySelector(selector);
      if (el && this.isVisibleImage(el)) {
        detailImg = el;
        break;
      }
    }

    // 如果没有找到明确的主图，尝试找到最大的图片
    if (!detailImg) {
      const allImages = document.querySelectorAll('img');
      let largestArea = 0;
      
      allImages.forEach(img => {
        const area = img.offsetWidth * img.offsetHeight;
        if (area > largestArea && area > 50000) { // 只考虑面积大于50000px²的图片
          largestArea = area;
          detailImg = img;
        }
      });
    }

    if (detailImg && !this.hasDownloadButton(detailImg)) {
      this.addDownloadButtonToImage(detailImg, 0, true); // 详情页按钮使用不同样式
    }
  }

  // 查找列表页图片元素
  findImageElements() {
    const selectors = [
      'img[src*="hellorf"]',
      'img[data-src*="hellorf"]', // 新增：支持data-src属性
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

  // 新增：检查是否为真实图片（不是占位符）
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
    return imgElement.offsetWidth > 100 && imgElement.offsetHeight > 100;
  }

  // 检查是否已有下载按钮
  hasDownloadButton(imgElement) {
    return imgElement.parentElement.querySelector('.hellorf-download-btn') !== null;
  }

  // 添加下载按钮到图片
  addDownloadButtonToImage(imgElement, index, isDetailPage = false) {
    const container = imgElement.parentElement;
    if (!container) return;

    // 确保容器有相对定位
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'hellorf-download-btn';
    downloadBtn.innerHTML = isDetailPage ? '⬇️ 下载图片' : '⬇️';
    downloadBtn.title = '下载图片';
    downloadBtn.dataset.imageIndex = index;

    this.positionDownloadButton(container, downloadBtn, isDetailPage);

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDownloadClick(imgElement, downloadBtn);
    });

    container.appendChild(downloadBtn);
  }

  // 定位下载按钮
  positionDownloadButton(container, button, isDetailPage = false) {
    if (isDetailPage) {
      // 详情页按钮样式
      button.style.position = 'absolute';
      button.style.bottom = '20px';
      button.style.right = '20px';
      button.style.zIndex = '1000';
      button.style.background = 'rgba(0,0,0,0.8)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '6px';
      button.style.padding = '10px 15px';
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
      button.innerHTML = button.innerHTML.includes('下载图片') ? '⏳ 下载中...' : '⏳';

      const imageInfo = await this.extractImageInfo(imgElement);
      console.log('imageInfo:', imageInfo);

      if (!imageInfo) {
        this.showMessage('无法获取图片信息', 'error');
        button.innerHTML = button.innerHTML.includes('下载中...') ? '⬇️ 下载图片' : '⬇️';
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
        
        button.innerHTML = button.innerHTML.includes('下载中...') ? '⬇️ 下载图片' : '⬇️';
        button.disabled = false;
      });

    } catch (error) {
      console.error('下载处理错误:', error);
      button.innerHTML = button.innerHTML.includes('下载中...') ? '⬇️ 下载图片' : '⬇️';
      button.disabled = false;
    }
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

  // 新增：提取详情页标题
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
    messageDiv.style.top = '10vh';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '10px';
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
          
          // 新增：为新增的图片元素添加懒加载观察
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
          this.injectDownloadButtonForDetailPage();
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