// 后台服务脚本
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // 监听扩展安装
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeStorage();
    });

    // 监听消息来自content script或popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放用于异步响应
    });
  }

  // 初始化存储
  async initializeStorage() {
    const defaultData = {
      isLoggedIn: false,
      userInfo: {
        creationUserId: '',
        creationUserName: ''
      },
      cookies: {}
    };

    const result = await chrome.storage.local.get(['userData']);
    if (!result.userData) {
      await chrome.storage.local.set({ userData: defaultData });
    }
  }

  // 处理消息
  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'checkLoginStatus':
        await this.checkLoginStatus(sendResponse);
        break;
      
      case 'loginRedirect':
        await this.redirectToLogin();
        sendResponse({ success: true });
        break;
      
      case 'downloadImage':
        await this.downloadImage(request.data, sendResponse);
        break;
      
      case 'updateUserInfo':
        await this.updateUserInfo(request.userInfo, sendResponse);
        break;
      
      case 'getUserInfo':
        await this.getUserInfo(sendResponse);
        break;
      
      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  }

  // 检查登录状态（并获取用户信息）
  async checkLoginStatus(sendResponse) {
    try {
      // 获取 test.xztimes.cn 的 cookie
      const cookies = await chrome.cookies.getAll({
        url: 'http://test.xztimes.cn/'
      });
      console.log('cookies', cookies);

      const userData = await this.getStorageData('userData');
      const hasValidCookies = cookies.length > 0;

      if (hasValidCookies) {
        const token = cookies[0].value; // 假设 cookies[0] 存储的就是 token
        console.log('token: ', token);

        try {
          // 请求 loginToken 接口
          const response = await fetch('http://117.24.14.3:1012/api/app/products/productimagelibrary/getlogininfobyplug', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('response:',response)
          if (response.ok) {
            const result = await response.json();
            console.log('loginToken result: ', result);

            // 更新用户信息
            userData.userInfo = {
              creationUserId: result.userId || '',
              creationUserName: result.userName || ''
            };
            userData.isLoggedIn = true;
            userData.cookies = cookies;

            await this.setStorageData('userData', userData);
          } else {
            console.error('loginToken接口请求失败:', response.status);
          }
        } catch (err) {
          console.error('调用 loginToken 接口出错:', err);
        }
      }

      sendResponse({ 
        isLoggedIn: userData.isLoggedIn && hasValidCookies, 
        hasCookies: hasValidCookies,
        userInfo: userData.userInfo
      });
    } catch (error) {
      console.error('检查登录状态错误:', error);
      sendResponse({ isLoggedIn: false, hasCookies: false });
    }
  }

  // 重定向到登录页面
  async redirectToLogin() {
    await chrome.tabs.create({
      url: 'http://test.xztimes.cn/'
    });
  }

  // 下载图片
  async downloadImage(data, sendResponse) {
    try {
      // 检查登录状态
      const loginStatus = await this.checkLoginStatusInternal();
      if (!loginStatus.isLoggedIn) {
        sendResponse({ 
          success: false, 
          error: '未登录',
          requiresLogin: true 
        });
        return;
      }

      // 获取用户信息
      const userData = await this.getStorageData('userData');
      console.log('userData: ', userData);

      // 准备请求数据
      const requestData = {
        imageId: data.imageId,
        productTitle: data.productTitle,
        creationUserId: userData.userInfo.creationUserId,
        creationUserName: userData.userInfo.creationUserName
      };
      console.log('requestData: ', requestData);

      // 发送API请求
      const response = await fetch('http://117.24.14.3:1012/api/app/products/productimagelibrary/batchpluguploadimage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response
        console.log(response)
        sendResponse({ success: true, data: result });
      } else {
        throw new Error(`HTTP错误: ${response.status}`);
      }
    } catch (error) {
      console.error('下载图片错误:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // 更新用户信息
  async updateUserInfo(userInfo, sendResponse) {
    try {
      const userData = await this.getStorageData('userData');
      userData.userInfo = { ...userData.userInfo, ...userInfo };
      userData.isLoggedIn = true;
      
      await this.setStorageData('userData', userData);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取用户信息
  async getUserInfo(sendResponse) {
    try {
      const userData = await this.getStorageData('userData');
      sendResponse({ success: true, userInfo: userData.userInfo });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // 内部登录状态检查
  async checkLoginStatusInternal() {
    const cookies = await chrome.cookies.getAll({
      url: 'http://test.xztimes.cn/'
    });
    
    const userData = await this.getStorageData('userData');
    return {
      isLoggedIn: userData.isLoggedIn && cookies.length > 0,
      hasCookies: cookies.length > 0
    };
  }

  // 存储辅助方法
  async getStorageData(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  }

  async setStorageData(key, data) {
    await chrome.storage.local.set({ [key]: data });
  }
}

// 初始化后台服务
new BackgroundService();
