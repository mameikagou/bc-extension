// 初始化BC扩展对象
(function() {
  // 生成唯一ID用于追踪请求和响应
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // 保存待处理的请求
  const pendingRequests = {};
  
  // 监听来自content script的消息
  window.addEventListener('message', event => {
    if (event.data.type === 'BC_EXTENSION_RESPONSE') {
      const { id, payload, error } = event.data;
      
      // 找到并处理对应的promise
      if (pendingRequests[id]) {
        if (error) {
          pendingRequests[id].reject(new Error(error));
        } else {
          pendingRequests[id].resolve(payload);
        }
        
        // 移除已处理的请求
        delete pendingRequests[id];
      }
    }
  });
  
  // 发送请求到content script
  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      
      pendingRequests[id] = { resolve, reject };
      
      window.postMessage({
        type: 'BC_EXTENSION_REQUEST',
        id,
        payload: {
          method,
          params
        }
      }, '*');
    });
  }
  
  // 定义BC扩展API
  const bcExtension = {
    // 连接到扩展
    async connect() {
      try {
        return await sendRequest('connect');
      } catch (error) {
        console.error('连接失败:', error);
        throw error;
      }
    },
    
    // 获取账户
    async getAccounts() {
      return sendRequest('getAccounts');
    },
    
    // 签名消息
    async signMessage(message) {
      return sendRequest('signMessage', { message });
    },

    // IPFS相关API
    ipfs: {
      // 获取当前IPFS节点
      async getCurrentNode() {
        return sendRequest('ipfs_getCurrentNode');
      },
      
      // 获取所有可用IPFS节点
      async getNodes() {
        return sendRequest('ipfs_getNodes');
      },
      
      // 切换IPFS节点
      async switchNode(nodeId) {
        return sendRequest('ipfs_switchNode', { nodeId });
      },
      
      // 上传文件到IPFS (模拟)
      async add(content) {
        return sendRequest('ipfs_add', { content });
      },
      
      // 从IPFS获取内容 (模拟)
      async get(cid) {
        return sendRequest('ipfs_get', { cid });
      },
      
      // 测试IPFS节点连接
      async testConnection(nodeId) {
        return sendRequest('ipfs_testConnection', { nodeId });
      }
    }
  };
  
  // 将API对象注入到window对象
  window.bcExtension = bcExtension;
})(); 