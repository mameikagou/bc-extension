// 存储已连接的网站
const connectedSites = new Set();
// 模拟账户信息
let accounts = [{ address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" }];
// 存储等待响应的请求
const pendingRequests = {};
// 存储上传文件的缓存 (模拟)
const ipfsFileCache = new Map();

// 处理扩展图标点击
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'popup.html' });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 确保消息来自内容脚本
  if (!sender.tab) return;

  const origin = request.origin || (sender.tab.url ? new URL(sender.tab.url).origin : null);
  const method = request.type;
  const params = request.params;
  
  // 处理IPFS相关请求
  if (method.startsWith('ipfs_')) {
    handleIpfsRequest(method, params, sendResponse);
    return true; // 异步响应
  }
  
  // 处理标准请求
  switch (method) {
    case 'connect':
      handleConnect(origin, sendResponse);
      break;
    case 'getAccounts':
      handleGetAccounts(origin, sendResponse);
      break;
    case 'signMessage':
      handleSignMessage(origin, params?.message, sendResponse);
      break;
    default:
      sendResponse({ error: '不支持的请求类型' });
  }
  
  // 返回true表示我们会异步发送响应
  return true;
});

// 处理来自弹窗的确认消息以及React组件的API请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理连接响应
  if (request.type === 'connection_response') {
    const { requestId, approved, origin } = request;
    
    // 找到等待响应的请求
    if (pendingRequests[requestId]) {
      if (approved) {
        // 用户同意连接
        connectedSites.add(origin);
        pendingRequests[requestId].sendResponse({ success: true });
      } else {
        // 用户拒绝连接
        pendingRequests[requestId].sendResponse({ error: '用户拒绝连接' });
      }
      
      // 关闭相关的确认窗口
      if (pendingRequests[requestId].windowId) {
        chrome.windows.remove(pendingRequests[requestId].windowId);
      }
      
      // 删除请求
      delete pendingRequests[requestId];
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  // 处理签名响应
  if (request.type === 'signature_response') {
    const { requestId, approved, signature } = request;
    
    // 找到等待响应的请求
    if (pendingRequests[requestId]) {
      if (approved && signature) {
        // 用户同意签名
        pendingRequests[requestId].sendResponse({ signature });
      } else {
        // 用户拒绝签名
        pendingRequests[requestId].sendResponse({ error: '用户拒绝签名' });
      }
      
      // 关闭相关的确认窗口
      if (pendingRequests[requestId].windowId) {
        chrome.windows.remove(pendingRequests[requestId].windowId);
      }
      
      // 删除请求
      delete pendingRequests[requestId];
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  // 获取已连接的网站列表
  if (request.type === 'getConnectedSites') {
    sendResponse({ sites: Array.from(connectedSites) });
    return true;
  }
  
  // 获取当前激活的IPFS节点
  if (request.type === 'getCurrentIpfsNode') {
    chrome.storage.local.get(['ipfsNodes', 'selectedIpfsNodeId'], (result) => {
      const nodeId = result.selectedIpfsNodeId || "1";
      const nodes = result.ipfsNodes || DEFAULT_IPFS_NODES;
      const currentNode = nodes.find(node => node.id === nodeId) || null;
      sendResponse({ currentNode });
    });
    return true;
  }
  
  // 处理来自React组件的IPFS节点API请求
  if (request.type === 'getIpfsNodes') {
    chrome.storage.local.get('ipfsNodes', (result) => {
      sendResponse({ nodes: result.ipfsNodes || DEFAULT_IPFS_NODES });
    });
    return true;
  }
  
  if (request.type === 'getSelectedIpfsNodeId') {
    chrome.storage.local.get('selectedIpfsNodeId', (result) => {
      sendResponse({ nodeId: result.selectedIpfsNodeId || "1" });
    });
    return true;
  }
  
  if (request.type === 'saveIpfsNodes') {
    if (!request.nodes || !Array.isArray(request.nodes)) {
      sendResponse({ error: '无效的节点数据' });
      return true;
    }
    
    chrome.storage.local.set({
      ipfsNodes: request.nodes
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.type === 'setSelectedIpfsNodeId') {
    if (!request.nodeId) {
      sendResponse({ error: '节点ID不能为空' });
      return true;
    }
    
    chrome.storage.local.set({
      selectedIpfsNodeId: request.nodeId
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.type === 'testIpfsConnection') {
    if (!request.nodeId) {
      sendResponse({ error: '节点ID不能为空' });
      return true;
    }
    
    chrome.storage.local.get('ipfsNodes', (result) => {
      const nodes = result.ipfsNodes || DEFAULT_IPFS_NODES;
      const node = nodes.find(n => n.id === request.nodeId);
      
      if (!node) {
        sendResponse({ error: '未找到指定的节点' });
        return;
      }
      
      // 模拟连接测试
      setTimeout(() => {
        const isSuccess = Math.random() > 0.3;
        if (isSuccess) {
          sendResponse({ success: true, node });
        } else {
          sendResponse({ error: '连接超时或失败' });
        }
      }, 800);
    });
    return true;
  }
});

// 处理IPFS相关请求
function handleIpfsRequest(method, params, sendResponse) {
  switch (method) {
    case 'ipfs_getCurrentNode':
      chrome.storage.local.get(['ipfsNodes', 'selectedIpfsNodeId'], (result) => {
        const nodeId = result.selectedIpfsNodeId || "1";
        const nodes = result.ipfsNodes || DEFAULT_IPFS_NODES;
        const currentNode = nodes.find(node => node.id === nodeId) || null;
        sendResponse({ currentNode });
      });
      break;
      
    case 'ipfs_getNodes':
      chrome.storage.local.get('ipfsNodes', (result) => {
        sendResponse({ nodes: result.ipfsNodes || DEFAULT_IPFS_NODES });
      });
      break;
      
    case 'ipfs_switchNode':
      if (!params?.nodeId) {
        sendResponse({ error: '节点ID不能为空' });
        return;
      }
      
      chrome.storage.local.get('ipfsNodes', (result) => {
        const nodes = result.ipfsNodes || DEFAULT_IPFS_NODES;
        const node = nodes.find(n => n.id === params.nodeId);
        
        if (!node) {
          sendResponse({ error: '未找到指定的节点' });
          return;
        }
        
        chrome.storage.local.set({
          selectedIpfsNodeId: params.nodeId
        }, () => {
          sendResponse({ success: true, node });
        });
      });
      break;
      
    case 'ipfs_add':
      if (!params?.content) {
        sendResponse({ error: '内容不能为空' });
        return;
      }
      
      // 模拟IPFS添加操作
      setTimeout(() => {
        try {
          // 生成随机CID
          const cid = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          
          // 存储文件内容到缓存
          ipfsFileCache.set(cid, {
            content: params.content,
            name: params.name || 'unnamed',
            type: params.type || 'application/octet-stream',
            size: params.size || params.content.length
          });
          
          // 如果缓存过大，删除最早的项目
          if (ipfsFileCache.size > 100) {
            const firstKey = ipfsFileCache.keys().next().value;
            ipfsFileCache.delete(firstKey);
          }
          
          sendResponse({ 
            cid, 
            size: params.size || params.content.length 
          });
        } catch (error) {
          sendResponse({ error: '上传文件失败: ' + error.message });
        }
      }, 1000);
      break;
      
    case 'ipfs_get':
      if (!params?.cid) {
        sendResponse({ error: 'CID不能为空' });
        return;
      }
      
      // 模拟IPFS获取操作
      setTimeout(() => {
        try {
          // 检查缓存中是否有此文件
          if (ipfsFileCache.has(params.cid)) {
            const fileData = ipfsFileCache.get(params.cid);
            sendResponse({ 
              content: fileData.content,
              name: fileData.name,
              mimeType: fileData.type
            });
            return;
          }
          
          // 如果没有找到文件但CID格式正确，返回模拟内容
          if (params.cid.startsWith('Qm')) {
            sendResponse({ 
              content: 'IPFS内容: ' + params.cid,
              name: 'ipfs-file.txt',
              mimeType: 'text/plain'
            });
          } else {
            sendResponse({ error: '无效的CID' });
          }
        } catch (error) {
          sendResponse({ error: '获取文件失败: ' + error.message });
        }
      }, 1000);
      break;
      
    case 'ipfs_testConnection':
      chrome.storage.local.get('ipfsNodes', (result) => {
        const nodes = result.ipfsNodes || DEFAULT_IPFS_NODES;
        const nodeId = params?.nodeId;
        const node = nodes.find(n => n.id === nodeId);
        
        if (!node) {
          sendResponse({ error: '未找到指定的节点' });
          return;
        }
        
        // 模拟连接测试
        setTimeout(() => {
          const isSuccess = Math.random() > 0.3;
          if (isSuccess) {
            sendResponse({ success: true, node });
          } else {
            sendResponse({ error: '连接超时或失败' });
          }
        }, 800);
      });
      break;
      
    default:
      sendResponse({ error: '不支持的IPFS操作' });
  }
}

// 默认IPFS节点
const DEFAULT_IPFS_NODES = [
  { id: "1", name: "Infura IPFS", url: "https://ipfs.infura.io:5001" },
  { id: "2", name: "Cloudflare IPFS", url: "https://cloudflare-ipfs.com" },
  { id: "3", name: "Pinata", url: "https://api.pinata.cloud" },
  { id: "4", name: "Local Node", url: "http://localhost:5001" },
];

// 处理连接请求
function handleConnect(origin, sendResponse) {
  try {
    // 生成请求ID
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // 创建一个弹出窗口
    chrome.windows.create({
      url: `popup.html#/connect?origin=${encodeURIComponent(origin)}&requestId=${requestId}`,
      type: 'popup',
      width: 400,
      height: 400,
      focused: true
    }, (window) => {
      // 保存请求信息和窗口ID
      pendingRequests[requestId] = {
        sendResponse,
        origin,
        windowId: window.id
      };
    });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

// 处理获取账户请求
function handleGetAccounts(origin, sendResponse) {
  if (!connectedSites.has(origin)) {
    sendResponse({ error: '网站未连接' });
    return;
  }
  
  sendResponse({ accounts });
}

// 处理签名消息请求
function handleSignMessage(origin, message, sendResponse) {
  if (!connectedSites.has(origin)) {
    sendResponse({ error: '网站未连接' });
    return;
  }
  
  // 生成请求ID
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // 创建一个弹出窗口进行确认
  chrome.windows.create({
    url: `popup.html#/sign?origin=${encodeURIComponent(origin)}&message=${encodeURIComponent(message)}&requestId=${requestId}`,
    type: 'popup',
    width: 400,
    height: 400,
    focused: true
  }, (window) => {
    // 保存请求信息和窗口ID
    pendingRequests[requestId] = {
      sendResponse,
      message,
      origin,
      windowId: window.id
    };
  });
} 