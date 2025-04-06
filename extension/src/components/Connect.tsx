import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 声明chrome类型，避免TypeScript错误
declare const chrome: any;

export default function Connect(): JSX.Element {
  const location = useLocation();
  const [origin, setOrigin] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  
  useEffect(() => {
    // 从URL获取请求连接的网站和请求ID
    const searchParams = new URLSearchParams(location.search);
    const originParam = searchParams.get("origin");
    const requestIdParam = searchParams.get("requestId");
    
    if (originParam) {
      setOrigin(decodeURIComponent(originParam));
    }
    
    if (requestIdParam) {
      setRequestId(requestIdParam);
    }
  }, [location]);
  
  const handleApprove = () => {
    // 发送确认消息到background.js
    chrome.runtime.sendMessage({
      type: 'connection_response',
      requestId,
      approved: true,
      origin
    }, (response: any) => {
      console.log('连接确认响应:', response);
    });
    
    // 窗口会被background.js关闭
  };
  
  const handleReject = () => {
    // 发送拒绝消息到background.js
    chrome.runtime.sendMessage({
      type: 'connection_response',
      requestId,
      approved: false,
      origin
    }, (response: any) => {
      console.log('连接拒绝响应:', response);
    });
    
    // 窗口会被background.js关闭
  };
  
  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>连接请求</h2>
      <p>{origin} 请求连接您的区块链账户</p>
      
      <div style={{ marginTop: "20px" }}>
        <p>连接该网站将允许它:</p>
        <ul>
          <li>查看您的账户地址</li>
          <li>请求签名交易</li>
        </ul>
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px" }}>
        <button
          onClick={handleReject}
          style={{
            padding: "10px 20px",
            background: "#555",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer"
          }}
        >
          拒绝
        </button>
        <button
          onClick={handleApprove}
          style={{
            padding: "10px 20px",
            background: "#3498db",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer"
          }}
        >
          连接
        </button>
      </div>
    </div>
  );
} 