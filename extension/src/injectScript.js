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
      
      const message = {
        type: 'BC_EXTENSION_REQUEST',
        id,
        payload: {
          method,
          params
        }
      };
      
      console.log('injectScript 发送请求:', method, params, message);
      
      window.postMessage(message, '*');
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
    
    // 上传文件到IPFS
    async uploadFileToIpfs(file) {
      try {
        // 简化文件处理，只发送基本信息
        return await sendRequest('uploadFileToIpfs', { 
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            // 不发送实际内容，让后台模拟
            content: 'mock-content-' + Math.random()
          }
        });
      } catch (error) {
        console.error('上传文件失败:', error);
        throw error;
      }
    },
    
    // 获取IPFS文件上传历史
    async getIpfsFileHistory() {
      try {
        console.log('发送getIpfsFileHistory请求');
        const response = await sendRequest('getIpfsFileHistory', {});
        console.log('收到getIpfsFileHistory响应:', response);
        return response;
      } catch (error) {
        console.error('获取上传历史失败:', error);
        throw error;
      }
    },
    
    // 下载IPFS文件
    async downloadIpfsFile(cid) {
      try {
        return await sendRequest('downloadIpfsFile', { cid });
      } catch (error) {
        console.error('下载文件失败:', error);
        throw error;
      }
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