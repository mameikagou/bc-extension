import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Account,
  accountApi,
  extensionApi,
  IpfsFile,
  IpfsNode,
} from "../utils/chromeApi";
import AccountHeader from "./AccountHeader";
import IpfsFileList from "./IpfsFileList";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [currentIpfsNode, setCurrentIpfsNode] = useState<IpfsNode | null>(null);
  const [connectedSites, setConnectedSites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [showFileHistory, setShowFileHistory] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // 获取当前激活的IPFS节点
        const node = await extensionApi.getCurrentIpfsNode();
        setCurrentIpfsNode(node);

        // 获取已连接的网站列表
        const sites = await extensionApi.getConnectedSites();
        setConnectedSites(sites);

        // 获取账户列表
        const allAccounts = await accountApi.getAccounts();
        setAccounts(allAccounts);

        // 检查是否有账户，没有则重定向到创建账户页面
        if (!allAccounts || allAccounts.length === 0) {
          navigate("/create-account");
          return;
        }

        // 获取当前账户
        const account = await accountApi.getCurrentAccount();
        setCurrentAccount(account);
      } catch (error) {
        console.error("加载数据失败:", error);
        // 如果出错，检查localStorage中是否有账户
        const localAccounts = localStorage.getItem("accounts");
        if (!localAccounts) {
          navigate("/create-account");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // 切换账户处理函数
  const handleAccountChange = async (accountId: string) => {
    try {
      await accountApi.setCurrentAccountId(accountId);
      const newCurrentAccount = accounts.find((acc) => acc.id === accountId);
      if (newCurrentAccount) {
        setCurrentAccount(newCurrentAccount);
      }
    } catch (error) {
      console.error("切换账户失败:", error);
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

  // 加载中或没有当前账户时显示加载界面
  if (isLoading || !currentAccount) {
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
        currentAccount={currentAccount}
        accounts={accounts}
        onAccountChange={handleAccountChange}
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

        {isLoading
          ? (
            <div style={{ padding: "10px", textAlign: "center" }}>
              加载中...
            </div>
          )
          : (
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
                  {currentIpfsNode?.name || "未设置"}
                </p>
                <p style={{ fontSize: "12px", color: "#999" }}>
                  {currentIpfsNode?.url || "未配置URL"}
                </p>
              </div>
            </div>
          )}
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
