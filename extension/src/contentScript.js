// 向页面注入脚本
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injectScript.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// 监听来自页面的消息
window.addEventListener('message', (event) => {
  // 确保消息来自我们期望的源
  if (event.source !== window) return;
  
  if (event.data.type && event.data.type === 'BC_EXTENSION_REQUEST') {
    const method = event.data.payload.method;
    const params = event.data.payload.params || {}; // 确保params始终是一个对象
    const requestId = event.data.id;
    
    console.log('Content script 接收请求详情:', {
      method,
      params,
      requestId,
      rawPayload: event.data.payload
    });
    
    // 所有请求都转发给background页面处理
    const message = {
      method: method,
      params: params,
      id: requestId,
      origin: window.location.origin
    };
    
    console.log('Content script 转发给background的消息详情:', message);
    
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('发送消息错误:', chrome.runtime.lastError);
        // 响应错误
        window.postMessage({
          type: 'BC_EXTENSION_RESPONSE',
          id: requestId,
          error: chrome.runtime.lastError.message || '扩展通信错误'
        }, '*');
        return;
      }
      
      console.log('Content script 接收响应详情:', {
        requestId,
        response,
        error: response?.error
      });
      
      // 处理来自background的响应
      window.postMessage({
        type: 'BC_EXTENSION_RESPONSE',
        id: requestId,
        payload: response,
        error: response?.error
      }, '*');
    });
  }
});

// 执行注入
injectScript(); 