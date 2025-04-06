import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "../utils/chromeApi";

const CreatePassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 外层容器固定宽度
  const containerWidth = "400px";

  const navigate = useNavigate();
  
  // 检查是否已有账户，如果有则直接导航到主页
  useEffect(() => {
    const checkAccounts = async () => {
      try {
        setIsLoading(true);
        
        // 初始化账户（如果需要）
        await accountApi.initializeIfNeeded();
        
        // 获取账户列表
        const accounts = await accountApi.getAccounts();
        
        // 如果已有账户，则自动跳转到首页
        if (accounts && accounts.length > 0) {
          // 确保默认选择第一个账户
          await accountApi.setCurrentAccountId("1");
          navigate("/home");
        }
      } catch (error) {
        console.error("检查账户失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccounts();
  }, [navigate]);
  
  const createWallet = async () => {
    // 验证密码
    if (password.length < 8) {
      setError("密码必须至少包含8个字符");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    
    try {
      // 在实际应用中，这里应该加密存储密码
      // 为了演示，我们只是简单地保存密码到localStorage
      localStorage.setItem("walletPassword", password);
      
      // 确保账户已初始化
      await accountApi.initializeIfNeeded();
      
      // 导航到主页
      navigate("/home");
    } catch (error) {
      console.error("创建钱包失败:", error);
      setError("创建钱包失败，请重试");
    }
  };
  
  // 显示加载中
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: "#1c1c1c",
        color: "white",
        padding: "40px",
        borderRadius: "16px",
        width: containerWidth,
        margin: "0 auto",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "300px"
      }}>
        检查账户中...
      </div>
    );
  }
  
  return (
    <div className="create-password-container" style={{
      backgroundColor: "#1c1c1c",
      color: "white",
      padding: "40px",
      borderRadius: "16px",
      width: containerWidth,
      margin: "0 auto",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div className="steps" style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginBottom: "20px"
      }}>
      </div>
      
      <h1 style={{
        fontSize: "28px",
        textAlign: "center",
        marginBottom: "20px",
        width: "100%"
      }}>创建密码</h1>
      
      <p style={{
        textAlign: "center",
        marginBottom: "30px",
        color: "#aaa",
        fontSize: "14px",
        width: "100%"
      }}>
        此密码只会在此设备上解锁您的钱包。它无法恢复此密码。
      </p>
      
      {error && (
        <div style={{
          backgroundColor: "#e74c3c",
          color: "white",
          padding: "10px",
          borderRadius: "4px",
          marginBottom: "20px",
          width: "100%",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}
      
      <div className="password-field" style={{ 
        marginBottom: "20px",
        width: "100%",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginBottom: "5px",
          width: "100%" 
        }}>
          <label style={{ fontSize: "14px" }}>新密码（至少 8 个字符）</label>
          <button 
            onClick={() => setShowPassword(!showPassword)}
            style={{ backgroundColor: "transparent", border: "none", color: "#3b99fc", cursor: "pointer" }}
          >
            {showPassword ? "隐藏" : "显示"}
          </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2a2a2a",
            border: "none",
            borderRadius: "4px",
            color: "white",
            fontSize: "16px"
          }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      
      <div className="confirm-password-field" style={{ 
        marginBottom: "20px",
        width: "100%",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginBottom: "5px",
          width: "100%" 
        }}>
          <label style={{ fontSize: "14px" }}>确认密码</label>
          <button 
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ backgroundColor: "transparent", border: "none", color: "#3b99fc", cursor: "pointer" }}
          >
            {showConfirmPassword ? "隐藏" : "显示"}
          </button>
        </div>
        <input
          type={showConfirmPassword ? "text" : "password"}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2a2a2a",
            border: "none",
            borderRadius: "4px",
            color: "white",
            fontSize: "16px"
          }}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <button
        style={{
          width: "100%",
          padding: "14px",
          backgroundColor: "#3b99fc",
          color: "white",
          border: "none",
          borderRadius: "50px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
        onClick={createWallet}
      >
        创建新钱包
      </button>
    </div>
  );
};

export default CreatePassword; 