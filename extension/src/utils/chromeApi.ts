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
  timestamp: number;
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
  // 上传文件到IPFS
  async uploadFile(file: File): Promise<IpfsFile> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        throw new Error('Chrome API不可用');
      }
      
      // 转换文件为base64
      const base64Content = await fileUtils.fileToBase64(file);
      
      // 发送到后台处理
      const response = await sendMessageToBackground({
        type: 'ipfs_add',
        params: {
          content: base64Content,
          name: file.name,
          type: file.type,
          size: file.size
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // 创建文件记录
      const ipfsFile: IpfsFile = {
        cid: response.cid,
        name: file.name,
        size: file.size,
        timestamp: Date.now()
      };
      
      // 保存到已上传文件列表
      await this.saveFileToHistory(ipfsFile);
      
      return ipfsFile;
    } catch (error) {
      console.error('上传文件失败:', error);
      throw error;
    }
  },
  
  // 根据CID获取文件
  async getFile(cid: string): Promise<{ content: string, name?: string, mimeType?: string }> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        throw new Error('Chrome API不可用');
      }
      
      // 从后台获取文件
      const response = await sendMessageToBackground({
        type: 'ipfs_get',
        params: { cid }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return {
        content: response.content,
        name: response.name,
        mimeType: response.mimeType
      };
    } catch (error) {
      console.error('获取文件失败:', error);
      throw error;
    }
  },
  
  // 获取上传历史
  async getUploadHistory(): Promise<IpfsFile[]> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，无法获取上传历史');
        return [];
      }
      
      return new Promise((resolve) => {
        chrome.storage.local.get('ipfsFiles', (result: any) => {
          const files = result.ipfsFiles || [];
          resolve(files);
        });
      });
    } catch (error) {
      console.error('获取上传历史失败:', error);
      return [];
    }
  },
  
  // 保存文件到历史记录
  async saveFileToHistory(file: IpfsFile): Promise<boolean> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法保存文件历史');
        return false;
      }
      
      // 获取现有历史
      const existingFiles = await this.getUploadHistory();
      
      // 添加新文件（避免重复）
      const exists = existingFiles.some(f => f.cid === file.cid);
      if (!exists) {
        const updatedFiles = [file, ...existingFiles].slice(0, 50); // 只保留最近50个
        
        return new Promise((resolve) => {
          chrome.storage.local.set({ ipfsFiles: updatedFiles }, () => {
            resolve(true);
          });
        });
      }
      
      return true;
    } catch (error) {
      console.error('保存文件历史失败:', error);
      return false;
    }
  },
  
  // 清除上传历史
  async clearUploadHistory(): Promise<boolean> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法清除文件历史');
        return false;
      }
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ ipfsFiles: [] }, () => {
          resolve(true);
        });
      });
    } catch (error) {
      console.error('清除文件历史失败:', error);
      return false;
    }
  }
};

// 账户相关API
export const accountApi = {
  // 获取所有账户
  async getAccounts(): Promise<Account[]> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，返回默认账户');
        return DEFAULT_ACCOUNTS;
      }

      // 先尝试从storage获取
      return new Promise((resolve) => {
        chrome.storage.local.get('accounts', (result: any) => {
          if (result.accounts && Array.isArray(result.accounts) && result.accounts.length > 0) {
            resolve(result.accounts);
          } else {
            // 没有保存的账户，则初始化并保存默认账户
            chrome.storage.local.set({ accounts: DEFAULT_ACCOUNTS }, () => {
              resolve(DEFAULT_ACCOUNTS);
            });
          }
        });
      });
    } catch (error) {
      console.error('获取账户失败:', error);
      return DEFAULT_ACCOUNTS;
    }
  },

  // 获取当前选中的账户ID
  async getCurrentAccountId(): Promise<string> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，返回默认账户ID');
        return "1";
      }

      return new Promise((resolve) => {
        chrome.storage.local.get('currentAccountId', (result: any) => {
          if (result.currentAccountId) {
            resolve(result.currentAccountId);
          } else {
            // 没有选中的账户，则设置为第一个账户
            chrome.storage.local.set({ currentAccountId: "1" }, () => {
              resolve("1");
            });
          }
        });
      });
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
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法设置当前账户');
        return false;
      }

      return new Promise((resolve) => {
        chrome.storage.local.set({ currentAccountId: accountId }, () => {
          resolve(true);
        });
      });
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
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ accounts: updatedAccounts }, () => {
          resolve(newAccount);
        });
      });
    } catch (error) {
      console.error('添加账户失败:', error);
      throw error;
    }
  },

  // 检查是否有账户，没有则初始化
  async initializeIfNeeded(): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(['accounts', 'currentAccountId'], (result: any) => {
          // 如果已经有账户和选中的账户ID，则无需初始化
          if (result.accounts && Array.isArray(result.accounts) && result.accounts.length > 0 && result.currentAccountId) {
            resolve(false); // 返回false表示不需要初始化
            return;
          }
          
          // 需要初始化
          const initialState = {
            accounts: DEFAULT_ACCOUNTS,
            currentAccountId: "1"
          };
          
          chrome.storage.local.set(initialState, () => {
            resolve(true); // 返回true表示已初始化
          });
        });
      });
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
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，无法获取当前IPFS节点');
        return DEFAULT_IPFS_NODES[0];
      }

      const response = await sendMessageToBackground({ type: 'getCurrentIpfsNode' });
      return response.currentNode || DEFAULT_IPFS_NODES[0];
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
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，返回默认节点');
        return DEFAULT_IPFS_NODES;
      }

      const response = await sendMessageToBackground({ type: 'getIpfsNodes' });
      return response.nodes || DEFAULT_IPFS_NODES;
    } catch (error) {
      console.error('获取节点失败:', error);
      return DEFAULT_IPFS_NODES;
    }
  },

  // 获取当前选中的节点ID
  async getSelectedNodeId(): Promise<string> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.warn('Chrome API不可用，返回默认节点ID');
        return "1";
      }

      const response = await sendMessageToBackground({ type: 'getSelectedIpfsNodeId' });
      return response.nodeId || "1";
    } catch (error) {
      console.error('获取当前节点ID失败:', error);
      return "1";
    }
  },

  // 保存节点列表
  async saveNodes(nodes: IpfsNode[]): Promise<boolean> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法保存节点');
        return false;
      }

      await sendMessageToBackground({ 
        type: 'saveIpfsNodes', 
        nodes 
      });
      return true;
    } catch (error) {
      console.error('保存节点失败:', error);
      return false;
    }
  },

  // 设置当前选中的节点
  async setSelectedNodeId(nodeId: string): Promise<boolean> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法设置当前节点');
        return false;
      }

      await sendMessageToBackground({ 
        type: 'setSelectedIpfsNodeId', 
        nodeId 
      });
      return true;
    } catch (error) {
      console.error('设置当前节点失败:', error);
      return false;
    }
  },

  // 测试节点连接
  async testConnection(nodeId: string): Promise<{success: boolean, message: string}> {
    try {
      // 检查Chrome API是否可用
      if (!isChromeApiAvailable()) {
        console.error('Chrome API不可用，无法测试连接');
        return {
          success: false,
          message: 'Chrome API不可用，无法测试连接'
        };
      }

      const response = await sendMessageToBackground({ 
        type: 'testIpfsConnection', 
        nodeId 
      });
      return {
        success: !!response.success,
        message: response.success ? '连接成功' : (response.error || '连接失败')
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}; 