import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  extensionApi,
  IpfsFile,
  IpfsNode,
  DEFAULT_IPFS_NODES,
} from "../utils/chromeApi";
import { Account, accountStorage, DEFAULT_TEST_ACCOUNTS } from "../utils/accountStorage";
import AccountHeader from "./AccountHeader";
import IpfsFileList from "./IpfsFileList";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [currentIpfsNode, setCurrentIpfsNode] = useState<IpfsNode | null>(DEFAULT_IPFS_NODES[0]);
  const [connectedSites, setConnectedSites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 默认不显示加载状态
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_TEST_ACCOUNTS);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(DEFAULT_TEST_ACCOUNTS[0]);
  const [showFileHistory, setShowFileHistory] = useState<boolean>(true);
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);

  // 分离加载不同类型的数据，避免一个失败影响全部
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        console.log('开始加载账户数据...');
        
        // 初始化默认值，确保即使API失败也有数据显示
        setAccounts(DEFAULT_TEST_ACCOUNTS);
        setCurrentAccount(DEFAULT_TEST_ACCOUNTS[0]);
        
        // 尝试迁移localStorage中的账户数据到localForage
        try {
          await accountStorage.migrateFromLocalStorage();
        } catch (error) {
          console.error("迁移localStorage数据失败:", error);
          // 继续执行，不影响其他操作
        }
        
        // 初始化账户如果需要
        try {
          await accountStorage.initializeIfNeeded();
        } catch (error) {
          console.error("初始化账户数据失败:", error);
          // 继续执行，不影响其他操作
        }

        // 获取账户列表
        try {
          const allAccounts = await accountStorage.getAccounts();
          console.log('获取到账户列表:', allAccounts);
          if (allAccounts && allAccounts.length > 0) {
            setAccounts(allAccounts);
          }
        } catch (error) {
          console.error("获取账户列表失败:", error);
          // 继续使用默认账户
        }

        // 获取当前账户
        try {
          const account = await accountStorage.getCurrentAccount();
          console.log('获取到当前账户:', account);
          if (account) {
            setCurrentAccount(account);
          }
        } catch (error) {
          console.error("获取当前账户失败:", error);
          // 继续使用默认账户
        }
        
        console.log('账户数据加载完成');
      } catch (error) {
        console.error("加载账户数据失败:", error);
        // 不重定向，使用默认数据
      }
    };
    
    const loadIpfsData = async () => {
      try {
        console.log('开始加载IPFS数据...');
        
        // 设置默认节点，确保即使API失败也有数据显示
        setCurrentIpfsNode(DEFAULT_IPFS_NODES[0]);
        
        // 获取当前激活的IPFS节点
        try {
          const node = await extensionApi.getCurrentIpfsNode();
          console.log('获取到IPFS节点:', node);
          if (node) {
            setCurrentIpfsNode(node);
          }
        } catch (error) {
          console.error("获取IPFS节点失败:", error);
          // 继续使用默认节点
        }
        
        console.log('IPFS数据加载完成');
      } catch (error) {
        console.error("加载IPFS数据失败:", error);
      }
    };
    
    const loadConnectionData = async () => {
      try {
        console.log('开始加载连接数据...');
        
        // 设置默认值，确保即使API失败也有数据显示
        setConnectedSites([]);
        
        // 获取已连接的网站列表
        try {
          const sites = await extensionApi.getConnectedSites();
          console.log('获取到连接站点:', sites);
          setConnectedSites(sites || []);
        } catch (error) {
          console.error("获取连接站点失败:", error);
          // 继续使用空数组
        }
        
        console.log('连接数据加载完成');
      } catch (error) {
        console.error("加载连接数据失败:", error);
      }
    };

    const initializeData = async () => {
      try {
        // 设置为加载中状态
        setIsLoading(true);
        
        // 并行加载所有数据
        await Promise.all([
          loadAccountData(),
          loadIpfsData(),
          loadConnectionData()
        ]);
        
        setIsDataInitialized(true);
      } catch (error) {
        console.error("初始化数据失败:", error);
      } finally {
        // 无论成功失败，都结束加载状态
        setIsLoading(false);
      }
    };

    // 只在组件首次渲染时加载数据
    if (!isDataInitialized) {
      initializeData();
    }
  }, [isDataInitialized, navigate]);

  // 切换账户处理函数
  const handleAccountChange = async (accountId: string) => {
    try {
      await accountStorage.setCurrentAccountId(accountId);
      const newCurrentAccount = accounts.find((acc) => acc.id === accountId);
      if (newCurrentAccount) {
        setCurrentAccount(newCurrentAccount);
      }
    } catch (error) {
      console.error("切换账户失败:", error);
    }
  };
  
  // 删除账户处理函数
  const handleAccountDelete = async (accountId: string): Promise<boolean> => {
    try {
      // 使用accountStorage删除账户
      const success = await accountStorage.deleteAccount(accountId);
      
      if (success) {
        // 更新账户列表
        const updatedAccounts = await accountStorage.getAccounts();
        setAccounts(updatedAccounts);
        
        // 更新当前账户
        const updatedCurrentAccount = await accountStorage.getCurrentAccount();
        setCurrentAccount(updatedCurrentAccount);
      }
      
      return success;
    } catch (error) {
      console.error("删除账户失败:", error);
      return false;
    }
  };

  // 处理文件选择
  const handleFileSelect = (file: IpfsFile) => {
    navigator.clipboard.writeText(file.cid);
    alert(`已复制CID: ${file.cid}`);
  };

  // 切换显示文件历史
  const toggleFileHistory = () => {
    setShowFileHistory(!showFileHistory);
  };

  // 只在初始加载时显示加载界面，不再检查currentAccount (因为有默认值)
  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "#1c1c1c",
          color: "white",
          padding: "40px",
          borderRadius: "16px",
          maxWidth: "400px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#1c1c1c",
        color: "white",
        padding: "20px",
        borderRadius: "16px",
        maxWidth: "400px",
        margin: "0 auto",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* 账户头部 */}
      <AccountHeader
        currentAccount={currentAccount || DEFAULT_TEST_ACCOUNTS[0]}
        accounts={accounts}
        onAccountChange={handleAccountChange}
        onAccountDelete={handleAccountDelete}
      />

      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>钱包首页</h1>

      {/* 当前IPFS节点信息 */}
      <div
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 style={{ fontSize: "18px" }}>当前去中心化存储</h3>
          <div style={{ display: "flex" }}>
            <button
              onClick={() => navigate("/ipfs-settings")}
              style={{
                padding: "5px 10px",
                backgroundColor: "#2ecc71",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
                marginRight: "5px",
              }}
            >
              节点设置
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px",
            background: "#333",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#2ecc71",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "15px",
              fontSize: "12px",
            }}
          >
            IPFS
          </div>
          <div>
            <p style={{ fontWeight: "bold" }}>
              {currentIpfsNode?.name || "默认节点"}
            </p>
            <p style={{ fontSize: "12px", color: "#999" }}>
              {currentIpfsNode?.url || "https://ipfs.infura.io:5001"}
            </p>
          </div>
        </div>
      </div>

      {/* IPFS文件历史折叠面板 */}
      <div
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={toggleFileHistory}
        >
          <h3 style={{ fontSize: "18px", margin: 0 }}>存储文件记录</h3>
          <button
            onClick={() =>
              navigate("/ipfs-settings", { state: { tab: "files" } })}
            style={{
              padding: "5px 10px",
              backgroundColor: "#3b99fc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            文件管理
          </button>
        </div>

        {showFileHistory && (
          <div style={{ marginTop: "15px" }}>
            <IpfsFileList onFileSelect={handleFileSelect} />
          </div>
        )}
      </div>

      {/* 已连接的网站列表 */}
      <div
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ fontSize: "18px", marginBottom: "15px" }}>已连接的网站</h3>

        {isLoading
          ? (
            <div style={{ padding: "10px", textAlign: "center" }}>
              加载中...
            </div>
          )
          : connectedSites.length === 0
          ? (
            <div
              style={{ padding: "10px", textAlign: "center", color: "#999" }}
            >
              暂无已连接的网站
            </div>
          )
          : (
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              {connectedSites.map((site, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px",
                    borderBottom: index < connectedSites.length - 1
                      ? "1px solid #444"
                      : "none",
                    background: "#333",
                    borderRadius: "4px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ color: "#fff" }}>
                    {site}
                  </div>
                  <button
                    style={{
                      backgroundColor: "#e74c3c",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    断开
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Home;
