import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

// 声明chrome类型，避免TypeScript错误
declare const chrome: any;

export default function Sign(): JSX.Element {
  const location = useLocation();
  const [origin, setOrigin] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  
  useEffect(() => {
    // 从URL获取请求连接的网站、消息和请求ID
    const searchParams = new URLSearchParams(location.search);
    const originParam = searchParams.get("origin");
    const messageParam = searchParams.get("message");
    const requestIdParam = searchParams.get("requestId");
    
    if (originParam) {
      setOrigin(decodeURIComponent(originParam));
    }
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    }
    
    if (requestIdParam) {
      setRequestId(requestIdParam);
    }
  }, [location]);
  
  const handleApprove = () => {
    // 生成签名
    const signature = `0x${Array.from(crypto.getRandomValues(new Uint8Array(65)))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('')}`;
      
    // 发送确认消息到background.js
    chrome.runtime.sendMessage({
      type: 'signature_response',
      requestId,
      approved: true,
      signature,
      origin
    }, (response: any) => {
      console.log('签名确认响应:', response);
    });
    
    // 窗口会被background.js关闭
  };
  
  const handleReject = () => {
    // 发送拒绝消息到background.js
    chrome.runtime.sendMessage({
      type: 'signature_response',
      requestId,
      approved: false,
      origin
    }, (response: any) => {
      console.log('签名拒绝响应:', response);
    });
    
    // 窗口会被background.js关闭
  };
  
  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>签名请求</h2>
      <p>{origin} 请求您签名以下消息:</p>
      
      <div style={{ 
        marginTop: "20px", 
        background: "#2c2c2c", 
        padding: "15px", 
        borderRadius: "4px",
        wordBreak: "break-word"
      }}>
        <p>{message}</p>
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
          签名
        </button>
      </div>
    </div>
  );
} 