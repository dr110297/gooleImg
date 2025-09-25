// 弹出窗口逻辑
document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const userInfoDiv = document.getElementById('userInfo');
  const userIdSpan = document.getElementById('userId');
  const userNameSpan = document.getElementById('userName');
  const loginBtn = document.getElementById('loginBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  // 检查登录状态
  checkLoginStatus();

  // 登录按钮点击
  loginBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'loginRedirect' });
    window.close();
  });

  // 刷新按钮点击
  refreshBtn.addEventListener('click', function() {
    checkLoginStatus();
  });

  // 设置用户信息按钮点击
//   optionsBtn.addEventListener('click', function() {
//     const userId = prompt('请输入用户ID:');
//     const userName = prompt('请输入用户名:');
    
//     if (userId && userName) {
//       chrome.runtime.sendMessage({
//         action: 'updateUserInfo',
//         userInfo: {
//           creationUserId: userId,
//           creationUserName: userName
//         }
//       }, function(response) {
//         if (response && response.success) {
//           alert('用户信息更新成功');
//           checkLoginStatus();
//         } else {
//           alert('更新失败: ' + (response?.error || '未知错误'));
//         }
//       });
//     }
//   });

  // 检查登录状态函数
  function checkLoginStatus() {
    statusDiv.textContent = '检查状态中...';
    statusDiv.className = 'status';
    
    chrome.runtime.sendMessage({ action: 'checkLoginStatus' }, function(response) {
        console.log(response)
      if (response && response.isLoggedIn) {
        statusDiv.textContent = '已登录';
        statusDiv.className = 'status logged-in';
        loginBtn.style.display = 'none';
        
        // 显示用户信息
        displayUserInfo();
      } else {
        statusDiv.textContent = '未登录';
        statusDiv.className = 'status logged-out';
        loginBtn.style.display = 'block';
        userInfoDiv.style.display = 'none';
      }
    });
  }

  // 显示用户信息
  function displayUserInfo() {
    chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
      if (response && response.success && response.userInfo) {
        userIdSpan.textContent = response.userInfo.creationUserId || '未设置';
        userNameSpan.textContent = response.userInfo.creationUserName || '未设置';
        userInfoDiv.style.display = 'block';
      }
    });
  }
});