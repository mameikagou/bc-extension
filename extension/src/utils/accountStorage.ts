import localforage from 'localforage';

// 账户类型定义
export interface Account {
  id: string;
  name: string;
  address: string;
  icon?: string;
}

// 默认测试账户
export const DEFAULT_TEST_ACCOUNTS: Account[] = [
  {
    id: "1",
    name: "测试账户 1",
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  },
  {
    id: "2",
    name: "测试账户 2",
    address: "0xD69B8ff1D98451A3bedA461C07bf8D5fb0e29e14"
  }
];

// 初始化localforage实例专门用于账户管理
const accountsStore = localforage.createInstance({
  name: 'bc-wallet',
  storeName: 'accounts'
});

// 账户相关API
export const accountStorage = {
  // 获取所有账户
  async getAccounts(): Promise<Account[]> {
    try {
      // 先尝试从localForage获取
      const accounts = await accountsStore.getItem<Account[]>('accounts');
      
      // 如果有数据则返回
      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        console.log('从localForage获取到账户:', accounts.length, '个');
        return accounts;
      }
      
      // 尝试从localStorage获取
      try {
        const accountsJson = localStorage.getItem('accounts');
        if (accountsJson) {
          const localAccounts = JSON.parse(accountsJson);
          if (Array.isArray(localAccounts) && localAccounts.length > 0) {
            console.log('从localStorage获取到账户:', localAccounts.length, '个');
            // 同步到localForage
            await this.saveAccounts(localAccounts);
            return localAccounts;
          }
        }
      } catch (e) {
        console.error('从localStorage读取账户失败:', e);
      }
      
      // 都没有数据，使用默认测试账户
      console.log('未找到账户数据，使用默认测试账户');
      await this.saveAccounts(DEFAULT_TEST_ACCOUNTS);
      return DEFAULT_TEST_ACCOUNTS;
    } catch (error) {
      console.error('获取账户失败:', error);
      // 出错时使用默认测试账户避免UI卡在加载状态
      return DEFAULT_TEST_ACCOUNTS;
    }
  },

  // 保存账户列表
  async saveAccounts(accounts: Account[]): Promise<boolean> {
    try {
      await accountsStore.setItem('accounts', accounts);
      return true;
    } catch (error) {
      console.error('保存账户失败:', error);
      return false;
    }
  },

  // 获取当前选中的账户ID
  async getCurrentAccountId(): Promise<string | null> {
    try {
      // 从localForage获取
      const id = await accountsStore.getItem<string>('currentAccountId');
      if (id) return id;
      
      // 尝试从localStorage获取
      const localId = localStorage.getItem('currentAccountId');
      if (localId) {
        // 同步到localForage
        await this.setCurrentAccountId(localId);
        return localId;
      }
      
      // 没有找到ID，默认使用第一个账户
      return "1";
    } catch (error) {
      console.error('获取当前账户ID失败:', error);
      return "1"; // 默认返回ID 1
    }
  },

  // 设置当前选中的账户ID
  async setCurrentAccountId(accountId: string): Promise<boolean> {
    try {
      await accountsStore.setItem('currentAccountId', accountId);
      return true;
    } catch (error) {
      console.error('设置当前账户ID失败:', error);
      return false;
    }
  },

  // 获取当前账户
  async getCurrentAccount(): Promise<Account | null> {
    try {
      const accounts = await this.getAccounts();
      const currentAccountId = await this.getCurrentAccountId();
      
      if (!currentAccountId) {
        // 没有找到账户ID，返回第一个账户
        console.log('未找到当前账户ID，返回第一个账户');
        return accounts[0] || DEFAULT_TEST_ACCOUNTS[0];
      }
      
      // 查找指定ID的账户
      const currentAccount = accounts.find(account => account.id === currentAccountId);
      
      // 如果找到则返回
      if (currentAccount) {
        return currentAccount;
      }
      
      // 没有找到，返回第一个账户
      console.log('未找到指定ID的账户，返回第一个账户');
      if (accounts.length > 0) {
        await this.setCurrentAccountId(accounts[0].id);
        return accounts[0];
      }
      
      // 所有方法都失败，返回默认测试账户
      console.log('没有可用账户，返回默认测试账户');
      await this.saveAccounts(DEFAULT_TEST_ACCOUNTS);
      await this.setCurrentAccountId(DEFAULT_TEST_ACCOUNTS[0].id);
      return DEFAULT_TEST_ACCOUNTS[0];
    } catch (error) {
      console.error('获取当前账户失败:', error);
      // 出错时返回默认测试账户
      return DEFAULT_TEST_ACCOUNTS[0];
    }
  },

  // 添加新账户
  async addAccount(accountName: string): Promise<Account | null> {
    try {
      // 获取现有账户
      const accounts = await this.getAccounts();
      
      // 生成随机地址
      const randomAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // 创建新账户ID (基于时间戳确保唯一)
      const newId = Date.now().toString();
      
      // 新账户对象
      const newAccount: Account = {
        id: newId,
        name: accountName,
        address: randomAddress
      };
      
      // 添加到账户列表
      const updatedAccounts = [...accounts, newAccount];
      
      // 保存更新后的列表
      await this.saveAccounts(updatedAccounts);
      
      // 设置为当前账户
      await this.setCurrentAccountId(newId);
      
      return newAccount;
    } catch (error) {
      console.error('添加账户失败:', error);
      return null;
    }
  },

  // 删除账户
  async deleteAccount(accountId: string): Promise<boolean> {
    try {
      // 获取账户列表
      const accounts = await this.getAccounts();
      
      // 确保至少有一个账户
      if (accounts.length <= 1) {
        throw new Error('无法删除唯一的账户');
      }
      
      // 检查是否删除当前账户
      const currentAccountId = await this.getCurrentAccountId();
      const isCurrentAccount = currentAccountId === accountId;
      
      // 更新账户列表
      const updatedAccounts = accounts.filter(account => account.id !== accountId);
      
      // 保存更新后的列表
      await this.saveAccounts(updatedAccounts);
      
      // 如果删除的是当前账户，则选择第一个账户
      if (isCurrentAccount && updatedAccounts.length > 0) {
        await this.setCurrentAccountId(updatedAccounts[0].id);
      }
      
      return true;
    } catch (error) {
      console.error('删除账户失败:', error);
      return false;
    }
  },
  
  // 更新账户
  async updateAccount(account: Account): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      const index = accounts.findIndex(a => a.id === account.id);
      
      if (index === -1) {
        return false;
      }
      
      // 更新账户
      accounts[index] = account;
      
      // 保存更新后的列表
      await this.saveAccounts(accounts);
      return true;
    } catch (error) {
      console.error('更新账户失败:', error);
      return false;
    }
  },

  // 初始化账户(如果需要)
  async initializeIfNeeded(): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      const currentAccountId = await this.getCurrentAccountId();
      
      // 已有账户和当前账户ID
      if (accounts.length > 0 && currentAccountId) {
        return false; // 不需要初始化
      }
      
      // 创建默认账户
      const randomAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const defaultAccount: Account = {
        id: "1",
        name: "我的账户",
        address: randomAddress
      };
      
      // 保存默认账户
      await this.saveAccounts([defaultAccount]);
      await this.setCurrentAccountId("1");
      
      return true; // 初始化成功
    } catch (error) {
      console.error('初始化账户失败:', error);
      // 发生错误时也要尝试使用默认账户
      await this.saveAccounts(DEFAULT_TEST_ACCOUNTS);
      await this.setCurrentAccountId(DEFAULT_TEST_ACCOUNTS[0].id);
      return true;
    }
  },
  
  // 迁移localStorage中的账户数据到localForage
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      // 检查是否有localStorage数据
      const accountsJson = localStorage.getItem('accounts');
      const currentAccountId = localStorage.getItem('currentAccountId');
      
      if (!accountsJson) {
        return false; // 没有数据需要迁移
      }
      
      // 解析数据
      const accounts = JSON.parse(accountsJson);
      
      // 保存到localForage
      await this.saveAccounts(accounts);
      
      if (currentAccountId) {
        await this.setCurrentAccountId(currentAccountId);
      }
      
      // 清除localStorage数据
      localStorage.removeItem('accounts');
      localStorage.removeItem('currentAccountId');
      
      return true;
    } catch (error) {
      console.error('迁移数据失败:', error);
      return false;
    }
  }
}; 