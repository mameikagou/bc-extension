// 添加localForage
importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

// 初始化localforage实例
const ipfsFilesStore = localforage.createInstance({
  name: 'ipfs-files',
  storeName: 'files'
});

// 存储已连接的网站
const connectedSites = new Set();
// 模拟账户信息
let accounts = [{ address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" }];
// 存储等待响应的请求
const pendingRequests = {};

// 默认IPFS节点
const DEFAULT_IPFS_NODES = [
  { id: "1", name: "Infura IPFS", url: "https://ipfs.infura.io:5001" },
  { id: "2", name: "Cloudflare IPFS", url: "https://cloudflare-ipfs.com" },
  { id: "3", name: "Pinata", url: "https://api.pinata.cloud" },
  { id: "4", name: "Local Node", url: "http://localhost:5001" },
];

// 处理扩展图标点击
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'popup.html' });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // 确保消息来自内容脚本
  if (!sender.tab) {
    console.log('忽略非内容脚本消息:', request);
    return false;
  }

  console.log('Background 收到请求详情:', {
    request,
    sender: {
      tab: sender.tab.id,
      url: sender.tab.url
    }
  });
  
  const origin = request.origin || (sender.tab.url ? new URL(sender.tab.url).origin : null);
  const method = request.method || request.type; // 兼容两种格式
  const params = request.params || {};
  
  console.log('Background 处理详情:', {
    origin,
    method,
    params,
    methodType: typeof method
  });
  
  // 处理IPFS相关请求
  if (method && method.startsWith('ipfs_')) {
    handleIpfsRequest(method, params, sendResponse);
    return true; // 异步响应
  }
  
  // 处理标准请求
  switch (method) {
    case 'connect':
      console.log('BG V4 处理connect请求');
      handleConnect(origin, sendResponse);
      return true;
    case 'getAccounts':
      console.log('BG V4 处理getAccounts请求');
      handleGetAccounts(origin, sendResponse);
      return true;
    case 'signMessage':
      console.log('BG V4 处理signMessage请求');
      handleSignMessage(origin, params?.message, sendResponse);
      return true;
    default:
      console.error('不支持的请求类型:', method);
      sendResponse({ error: '不支持的请求类型' });
      return false;
  }
});

// 处理来自弹窗的确认消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background 收到其他请求:', request);
  
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
    const nodeId = localStorage.getItem('selectedIpfsNodeId') || "1";
    const nodesJson = localStorage.getItem('ipfsNodes');
    const nodes = nodesJson ? JSON.parse(nodesJson) : DEFAULT_IPFS_NODES;
    const currentNode = nodes.find(node => node.id === nodeId) || null;
    sendResponse({ currentNode });
    return true;
  }
  
  // 处理来自React组件的IPFS节点API请求
  if (request.type === 'getIpfsNodes') {
    const nodesJson = localStorage.getItem('ipfsNodes');
    const nodes = nodesJson ? JSON.parse(nodesJson) : DEFAULT_IPFS_NODES;
    sendResponse({ nodes });
    return true;
  }
  
  if (request.type === 'getSelectedIpfsNodeId') {
    const nodeId = localStorage.getItem('selectedIpfsNodeId') || "1";
    sendResponse({ nodeId });
    return true;
  }
  
  if (request.type === 'saveIpfsNodes') {
    if (!request.nodes || !Array.isArray(request.nodes)) {
      sendResponse({ error: '无效的节点数据' });
      return true;
    }
    
    localStorage.setItem('ipfsNodes', JSON.stringify(request.nodes));
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'setSelectedIpfsNodeId') {
    if (!request.nodeId) {
      sendResponse({ error: '节点ID不能为空' });
      return true;
    }
    
    localStorage.setItem('selectedIpfsNodeId', request.nodeId);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'testIpfsConnection') {
    if (!request.nodeId) {
      sendResponse({ error: '节点ID不能为空' });
      return true;
    }
    
    const nodesJson = localStorage.getItem('ipfsNodes');
    const nodes = nodesJson ? JSON.parse(nodesJson) : DEFAULT_IPFS_NODES;
    const node = nodes.find(n => n.id === request.nodeId);
    
    if (!node) {
      sendResponse({ error: '未找到指定的节点' });
      return true;
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
    return true;
  }
});

// 处理IPFS相关请求
function handleIpfsRequest(method, params, sendResponse) {
  switch (method) {
    case 'ipfs_getCurrentNode':
      const nodeId = localStorage.getItem('selectedIpfsNodeId') || "1";
      const nodesJson = localStorage.getItem('ipfsNodes');
      const nodes = nodesJson ? JSON.parse(nodesJson) : DEFAULT_IPFS_NODES;
      const currentNode = nodes.find(node => node.id === nodeId) || null;
      sendResponse({ currentNode });
      break;
      
    case 'ipfs_getNodes':
      const storedNodesJson = localStorage.getItem('ipfsNodes');
      const storedNodes = storedNodesJson ? JSON.parse(storedNodesJson) : DEFAULT_IPFS_NODES;
      sendResponse({ nodes: storedNodes });
      break;
      
    case 'ipfs_switchNode':
      if (!params?.nodeId) {
        sendResponse({ error: '节点ID不能为空' });
        return;
      }
      
      const switchNodesJson = localStorage.getItem('ipfsNodes');
      const switchNodes = switchNodesJson ? JSON.parse(switchNodesJson) : DEFAULT_IPFS_NODES;
      const node = switchNodes.find(n => n.id === params.nodeId);
      
      if (!node) {
        sendResponse({ error: '未找到指定的节点' });
        return;
      }
      
      localStorage.setItem('selectedIpfsNodeId', params.nodeId);
      sendResponse({ success: true, node });
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
          // 如果CID格式正确，返回模拟内容
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
      const testNodesJson = localStorage.getItem('ipfsNodes');
      const testNodes = testNodesJson ? JSON.parse(testNodesJson) : DEFAULT_IPFS_NODES;
      const testNodeId = params?.nodeId;
      const testNode = testNodes.find(n => n.id === testNodeId);
      
      if (!testNode) {
        sendResponse({ error: '未找到指定的节点' });
        return;
      }
      
      // 模拟连接测试
      setTimeout(() => {
        const isSuccess = Math.random() > 0.3;
        if (isSuccess) {
          sendResponse({ success: true, node: testNode });
        } else {
          sendResponse({ error: '连接超时或失败' });
        }
      }, 800);
      break;
      
    default:
      sendResponse({ error: '不支持的IPFS操作' });
  }
}

// 处理连接请求
function handleConnect(origin, sendResponse) {
  try {
    // 已连接的站点直接返回成功
    if (connectedSites.has(origin)) {
      console.log('站点已连接:', origin);
      sendResponse({ success: true });
      return;
    }
    
    // 添加到连接站点列表（简化起见，跳过弹窗确认）
    console.log('添加站点到连接列表:', origin);
    connectedSites.add(origin);
    sendResponse({ success: true });
    
    // 生成请求ID
    /*
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
    */
  } catch (error) {
    console.error('连接处理错误:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理获取账户请求
function handleGetAccounts(origin, sendResponse) {
  if (!connectedSites.has(origin)) {
    console.log('网站未连接，无法获取账户:', origin);
    sendResponse({ success: false, error: '网站未连接' });
    return;
  }
  
  console.log('返回账户信息');
  sendResponse({ success: true, data: accounts });
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