// 声明chrome类型，避免TypeScript错误
declare const chrome: any;

// 节点类型定义
export interface IpfsNode {
  id: string;
  name: string;
  url: string;
}

// 账户类型定义
export interface Account {
  id: string;
  name: string;
  address: string;
  icon?: string;
}

// IPFS文件类型
export interface IpfsFile {
  cid: string;
  name: string;
  size: number;
  timestamp?: number;  // 旧格式
  uploadTime?: string; // 新格式 - ISO字符串
  type?: string;
}

// 默认账户信息
export const DEFAULT_ACCOUNTS: Account[] = [
  { 
    id: "1", 
    name: "Account 1", 
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  },
  {
    id: "2",
    name: "Account 2",
    address: "0xD69B8ff1D98451A3bedA461C07bf8D5fb0e29e14"
  }
];

// 默认IPFS节点
export const DEFAULT_IPFS_NODES: IpfsNode[] = [
  { id: "1", name: "Infura IPFS", url: "https://ipfs.infura.io:5001" },
  { id: "2", name: "Cloudflare IPFS", url: "https://cloudflare-ipfs.com" },
  { id: "3", name: "Pinata", url: "https://api.pinata.cloud" },
  { id: "4", name: "Local Node", url: "http://localhost:5001" },
];

// 检查Chrome API是否可用
const isChromeApiAvailable = (): boolean => {
  return typeof chrome !== 'undefined' && 
         typeof chrome.runtime !== 'undefined' && 
         typeof chrome.runtime.sendMessage !== 'undefined';
};

// 安全地发送消息到background script
export function sendMessageToBackground(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // 检查Chrome API是否可用
    if (!isChromeApiAvailable()) {
      console.error('Chrome API不可用');
      reject(new Error('Chrome API不可用'));
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response: any) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome API错误:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      console.error('发送消息错误:', error);
      reject(error);
    }
  });
}

// 文件处理相关工具函数
export const fileUtils = {
  // 将文件转换为base64字符串
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // 去除base64的前缀，只保留内容部分
          const base64Content = reader.result.split(',')[1];
          resolve(base64Content);
        } else {
          reject(new Error('读取文件失败'));
        }
      };
      reader.onerror = error => reject(error);
    });
  },
  
  // 从base64字符串创建下载链接
  createDownloadFromBase64(base64Data: string, fileName: string, mimeType: string): void {
    // 创建base64的URL
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    
    // 触发下载
    link.click();
    
    // 清理
    document.body.removeChild(link);
  },
  
  // 根据MIME类型猜测文件扩展名
  getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'application/json': '.json',
      'application/xml': '.xml',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/zip': '.zip',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/webm': '.webm'
    };
    
    return mimeToExt[mimeType] || '.bin';
  }
};

// IPFS文件操作API
export const ipfsFileApi = {
  // 获取IPFS文件历史
  getHistory: (): Promise<IpfsFile[]> => {
    return new Promise((resolve) => {
      console.log('使用模拟数据替代真实历史记录');
      
      // 直接返回测试数据，不再使用chrome.storage.local
      setTimeout(() => {
        // 模拟的测试数据
        const testData = [
          {
            cid: 'bafybeiecidl2uz4qno3ycc6xwk2emgpfohn4xdmryb5axyl6ht5jv67tee',
            name: '测试文件1.jpg',
            type: 'image/jpeg',
            size: 1024 * 1024 * 2.5,
            timestamp: Date.now() - 3600000,
            uploadTime: new Date(Date.now() - 3600000).toISOString()
          },
          {
            cid: 'bafybeihcviruibsknjwow6nhvxsjsjmugvgzw5pinbv7nb6et77hytwxl4',
            name: '测试文档.pdf',
            type: 'application/pdf',
            size: 1024 * 1024 * 1.2,
            timestamp: Date.now() - 86400000,
            uploadTime: new Date(Date.now() - 86400000).toISOString()
          },
          {
            cid: 'bafybeifxqttlwjmyjcu2eppr6dbz5vb7sbnanstusrjja4xz3ve75vkdvm',
            name: '代码示例.js',
            type: 'application/javascript',
            size: 1024 * 15,
            timestamp: Date.now() - 2 * 86400000,
            uploadTime: new Date(Date.now() - 2 * 86400000).toISOString()
          }
        ];
        
        console.log('返回模拟数据:', testData.length, '条');
        resolve(testData);
      }, 300); // 模拟网络延迟
    });
  },
  
  // 旧版方法名称保持兼容性
  getUploadHistory: function(): Promise<IpfsFile[]> {
    return this.getHistory();
  },
  
  // 上传文件到IPFS
  uploadFile: (file: File): Promise<IpfsFile> => {
    return new Promise((resolve, reject) => {
      console.log('模拟文件上传');
      
      // 模拟上传延迟
      setTimeout(() => {
        try {
          // 生成一个随机的CID (IPFS v1格式)
          const cid = 'bafybeie' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          
          // 创建文件记录
          const fileData = {
            cid,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadTime: new Date().toISOString(),
            timestamp: Date.now()
          };
          
          console.log('模拟上传成功:', fileData);
          resolve(fileData);
        } catch (error) {
          console.error('模拟上传失败:', error);
          reject(new Error('上传失败'));
        }
      }, 1000);
    });
  },
  
  // 下载IPFS文件
  downloadFile: (cid: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log('模拟文件下载，CID:', cid);
      
      // 模拟下载延迟
      setTimeout(() => {
        try {
          // 模拟下载成功
          const fileData = {
            content: new TextEncoder().encode('模拟文件内容: ' + cid),
            name: 'download-' + cid.substring(0, 8) + '.txt',
            type: 'text/plain'
          };
          
          console.log('模拟下载成功:', fileData);
          resolve(fileData);
        } catch (error) {
          console.error('模拟下载失败:', error);
          reject(new Error('下载失败'));
        }
      }, 800);
    });
  },
  
  // 清除历史记录
  clearHistory: (): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log('模拟清除历史记录');
      
      // 模拟操作延迟
      setTimeout(() => {
        console.log('模拟清除历史记录成功');
        resolve(true);
      }, 500);
    });
  }
};

// 账户相关API
export const accountApi = {
  // 获取所有账户
  async getAccounts(): Promise<Account[]> {
    console.log('获取账户，使用模拟数据');
    
    try {
      // 从localStorage获取
      const accountsJson = localStorage.getItem('accounts');
      if (accountsJson) {
        const accounts = JSON.parse(accountsJson);
        if (Array.isArray(accounts) && accounts.length > 0) {
          return accounts;
        }
      }
      
      // 没有保存的账户，则初始化并保存默认账户
      localStorage.setItem('accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    } catch (error) {
      console.error('获取账户失败:', error);
      return DEFAULT_ACCOUNTS;
    }
  },

  // 获取当前选中的账户ID
  async getCurrentAccountId(): Promise<string> {
    try {
      const currentAccountId = localStorage.getItem('currentAccountId');
      if (currentAccountId) {
        return currentAccountId;
      }
      
      // 没有选中的账户，则设置为第一个账户
      localStorage.setItem('currentAccountId', "1");
      return "1";
    } catch (error) {
      console.error('获取当前账户ID失败:', error);
      return "1";
    }
  },

  // 获取当前账户
  async getCurrentAccount(): Promise<Account> {
    try {
      const accounts = await this.getAccounts();
      const currentAccountId = await this.getCurrentAccountId();
      const currentAccount = accounts.find(account => account.id === currentAccountId);
      
      if (!currentAccount) {
        // 如果找不到当前账户，返回第一个账户并更新当前账户ID
        if (accounts.length > 0) {
          await this.setCurrentAccountId(accounts[0].id);
          return accounts[0];
        }
        throw new Error('没有可用账户');
      }
      
      return currentAccount;
    } catch (error) {
      console.error('获取当前账户失败:', error);
      return DEFAULT_ACCOUNTS[0];
    }
  },

  // 设置当前账户ID
  async setCurrentAccountId(accountId: string): Promise<boolean> {
    try {
      localStorage.setItem('currentAccountId', accountId);
      return true;
    } catch (error) {
      console.error('设置当前账户ID失败:', error);
      return false;
    }
  },

  // 添加新账户
  async addAccount(account: Omit<Account, "id">): Promise<Account> {
    try {
      const accounts = await this.getAccounts();
      
      // 生成新ID (简单实现，实际应用可能需要更复杂的逻辑)
      const newId = (accounts.length + 1).toString();
      
      const newAccount: Account = {
        ...account,
        id: newId
      };
      
      const updatedAccounts = [...accounts, newAccount];
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
      
      return newAccount;
    } catch (error) {
      console.error('添加账户失败:', error);
      throw error;
    }
  },

  // 检查是否有账户，没有则初始化
  async initializeIfNeeded(): Promise<boolean> {
    try {
      // 检查localStorage中是否已有账户
      const accountsJson = localStorage.getItem('accounts');
      const currentAccountId = localStorage.getItem('currentAccountId');
      
      // 如果已经有账户和选中的账户ID，则无需初始化
      if (accountsJson && currentAccountId) {
        const accounts = JSON.parse(accountsJson);
        if (Array.isArray(accounts) && accounts.length > 0) {
          return false; // 返回false表示不需要初始化
        }
      }
      
      // 需要初始化
      localStorage.setItem('accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      localStorage.setItem('currentAccountId', "1");
      return true; // 返回true表示已初始化
    } catch (error) {
      console.error('初始化账户失败:', error);
      return false;
    }
  }
};

// 扩展通用API
export const extensionApi = {
  // 获取已连接的网站列表
  async getConnectedSites(): Promise<string[]> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，无法获取已连接网站');
        return [];
      }

      const response = await sendMessageToBackground({ type: 'getConnectedSites' });
      return response.sites || [];
    } catch (error) {
      console.error('获取已连接网站失败:', error);
      return [];
    }
  },

  // 获取当前激活的IPFS节点
  async getCurrentIpfsNode(): Promise<IpfsNode | null> {
    try {
      // 从localStorage中获取当前节点
      const nodeId = localStorage.getItem('selectedIpfsNodeId') || "1";
      const nodesJson = localStorage.getItem('ipfsNodes');
      let nodes = DEFAULT_IPFS_NODES;
      
      if (nodesJson) {
        try {
          const parsedNodes = JSON.parse(nodesJson);
          if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
            nodes = parsedNodes;
          }
        } catch (e) {
          console.error('解析节点数据失败:', e);
        }
      }
      
      const currentNode = nodes.find(node => node.id === nodeId) || nodes[0];
      return currentNode;
    } catch (error) {
      console.error('获取当前IPFS节点失败:', error);
      return DEFAULT_IPFS_NODES[0];
    }
  }
};

// IPFS节点相关操作
export const ipfsNodeApi = {
  // 获取所有节点
  async getNodes(): Promise<IpfsNode[]> {
    try {
      const nodesJson = localStorage.getItem('ipfsNodes');
      if (nodesJson) {
        try {
          const nodes = JSON.parse(nodesJson);
          if (Array.isArray(nodes) && nodes.length > 0) {
            return nodes;
          }
        } catch (e) {
          console.error('解析节点数据失败:', e);
        }
      }
      
      // 如果没有存储的节点或解析失败，使用默认节点
      localStorage.setItem('ipfsNodes', JSON.stringify(DEFAULT_IPFS_NODES));
      return DEFAULT_IPFS_NODES;
    } catch (error) {
      console.error('获取节点失败:', error);
      return DEFAULT_IPFS_NODES;
    }
  },

  // 获取当前选中的节点ID
  async getSelectedNodeId(): Promise<string> {
    try {
      const nodeId = localStorage.getItem('selectedIpfsNodeId');
      if (nodeId) {
        return nodeId;
      }
      
      // 没有选中的节点，设置为默认节点
      localStorage.setItem('selectedIpfsNodeId', "1");
      return "1";
    } catch (error) {
      console.error('获取当前节点ID失败:', error);
      return "1";
    }
  },

  // 保存节点列表
  async saveNodes(nodes: IpfsNode[]): Promise<boolean> {
    try {
      localStorage.setItem('ipfsNodes', JSON.stringify(nodes));
      return true;
    } catch (error) {
      console.error('保存节点失败:', error);
      return false;
    }
  },

  // 设置当前选中的节点
  async setSelectedNodeId(nodeId: string): Promise<boolean> {
    try {
      localStorage.setItem('selectedIpfsNodeId', nodeId);
      return true;
    } catch (error) {
      console.error('设置当前节点失败:', error);
      return false;
    }
  },

  // 测试节点连接
  async testConnection(nodeId: string): Promise<{success: boolean, message: string}> {
    try {
      // 模拟节点连接测试
      console.log(`模拟测试节点连接: ${nodeId}`);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 随机成功或失败
      const success = Math.random() > 0.3;
      return {
        success: success,
        message: success ? '连接成功' : '连接超时或失败'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}; 