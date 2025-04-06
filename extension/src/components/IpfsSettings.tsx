import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ipfsNodeApi, IpfsNode, DEFAULT_IPFS_NODES, IpfsFile } from "../utils/chromeApi";
import IpfsFileUpload from "./IpfsFileUpload";
import IpfsFileList from "./IpfsFileList";

interface LocationState {
  tab?: 'nodes' | 'files';
}

export default function IpfsSettings(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [ipfsNodes, setIpfsNodes] = useState<IpfsNode[]>(DEFAULT_IPFS_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("1");
  const [newNodeName, setNewNodeName] = useState<string>("");
  const [newNodeUrl, setNewNodeUrl] = useState<string>("");
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'nodes' | 'files'>(state?.tab || 'nodes');

  // 加载保存的IPFS节点和当前选中的节点
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        
        // 获取节点列表
        const nodes = await ipfsNodeApi.getNodes();
        setIpfsNodes(nodes);
        
        // 获取选中的节点ID
        const nodeId = await ipfsNodeApi.getSelectedNodeId();
        setSelectedNodeId(nodeId);
      } catch (error) {
        console.error("加载IPFS节点数据失败:", error);
        setErrorMessage("加载IPFS节点数据失败，使用默认配置");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // 保存节点到存储
  const saveNodes = async (nodes: IpfsNode[], selectedId: string) => {
    try {
      setErrorMessage("");
      await ipfsNodeApi.saveNodes(nodes);
      await ipfsNodeApi.setSelectedNodeId(selectedId);
    } catch (error) {
      console.error("保存节点数据失败:", error);
      setErrorMessage("保存节点数据失败，节点信息可能无法持久化");
    }
  };

  // 添加新节点
  const handleAddNode = () => {
    if (!newNodeName || !newNodeUrl) {
      setTestResult("节点名称和URL不能为空");
      return;
    }

    const newNode: IpfsNode = {
      id: Date.now().toString(),
      name: newNodeName,
      url: newNodeUrl
    };

    const updatedNodes = [...ipfsNodes, newNode];
    setIpfsNodes(updatedNodes);
    saveNodes(updatedNodes, selectedNodeId);
    setNewNodeName("");
    setNewNodeUrl("");
    setTestResult("新节点已添加");
  };

  // 选择节点
  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    saveNodes(ipfsNodes, id);
    setTestResult("已切换到新节点");
  };

  // 删除节点
  const handleDeleteNode = (id: string) => {
    // 不允许删除所有节点
    if (ipfsNodes.length <= 1) {
      setTestResult("至少需要保留一个节点");
      return;
    }

    const updatedNodes = ipfsNodes.filter(node => node.id !== id);
    setIpfsNodes(updatedNodes);
    
    // 如果删除的是当前选中的节点，则选择第一个节点
    if (id === selectedNodeId) {
      setSelectedNodeId(updatedNodes[0].id);
      saveNodes(updatedNodes, updatedNodes[0].id);
    } else {
      saveNodes(updatedNodes, selectedNodeId);
    }
    
    setTestResult("节点已删除");
  };

  // 测试连接
  const testConnection = async () => {
    setIsLoading(true);
    setTestResult("正在测试连接...");
    setErrorMessage("");
    
    try {
      const result = await ipfsNodeApi.testConnection(selectedNodeId);
      setTestResult(result.success ? 
        `成功连接到 ${ipfsNodes.find(node => node.id === selectedNodeId)?.name}` : 
        `连接失败: ${result.message}`
      );
    } catch (error) {
      setTestResult(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理新文件上传回调
  const handleFileUploaded = (file: IpfsFile) => {
    // 显示上传成功提示
    setTestResult(`文件 "${file.name}" 上传成功，CID: ${file.cid}`);
  };

  // 处理文件选择回调
  const handleFileSelect = (file: IpfsFile) => {
    navigator.clipboard.writeText(file.cid);
    setTestResult(`已复制 CID: ${file.cid}`);
  };

  return (
    <div style={{ padding: "20px", color: "white", maxWidth: "100%" }}>
      <h2 style={{ textAlign: "center" }}>去中心化存储设置</h2>
      
      {errorMessage && (
        <div style={{ 
          background: "#e74c3c", 
          padding: "10px", 
          borderRadius: "4px",
          marginBottom: "15px",
          color: "white" 
        }}>
          错误: {errorMessage}
        </div>
      )}

      {/* 标签导航 */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '20px', 
        borderBottom: '1px solid #444',
      }}>
        <div 
          onClick={() => setActiveTab('nodes')}
          style={{ 
            padding: '10px 15px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'nodes' ? '2px solid #3498db' : 'none',
            color: activeTab === 'nodes' ? '#fff' : '#aaa',
            fontWeight: activeTab === 'nodes' ? 'bold' : 'normal',
            marginRight: '10px'
          }}
        >
          节点管理
        </div>
        <div 
          onClick={() => setActiveTab('files')}
          style={{ 
            padding: '10px 15px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'files' ? '2px solid #3498db' : 'none',
            color: activeTab === 'files' ? '#fff' : '#aaa',
            fontWeight: activeTab === 'files' ? 'bold' : 'normal'
          }}
        >
          文件管理
        </div>
      </div>

      {testResult && (
        <div style={{ 
          marginBottom: "15px",
          background: testResult.includes('失败') ? "#3a1c17" : "#1a321b",
          padding: "10px", 
          borderRadius: "4px",
          color: testResult.includes('失败') ? "#e74c3c" : "#2ecc71" 
        }}>
          {testResult}
        </div>
      )}
      
      {activeTab === 'nodes' ? (
        /* 节点管理界面 */
        <>
          <div style={{ marginBottom: "20px" }}>
            <h3>当前节点</h3>
            {isLoading ? (
              <div style={{ padding: "10px", textAlign: "center" }}>加载中...</div>
            ) : (
              <div style={{ 
                background: "#2c2c2c", 
                padding: "10px", 
                borderRadius: "4px",
                marginBottom: "10px" 
              }}>
                {ipfsNodes.find(node => node.id === selectedNodeId)?.name || "未选择节点"}
              </div>
            )}
            <button 
              onClick={testConnection}
              disabled={isLoading}
              style={{
                padding: "5px 10px",
                background: "#3498db",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? "测试中..." : "测试连接"}
            </button>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <h3>可用节点</h3>
            <div style={{ 
              overflowY: "auto",
              background: "#2c2c2c", 
              padding: "10px", 
              borderRadius: "4px" 
            }}>
              {isLoading ? (
                <div style={{ padding: "10px", textAlign: "center" }}>加载中...</div>
              ) : ipfsNodes.length === 0 ? (
                <div style={{ padding: "10px", textAlign: "center" }}>无可用节点</div>
              ) : (
                ipfsNodes.map(node => (
                  <div 
                    key={node.id}
                    style={{ 
                      padding: "8px", 
                      marginBottom: "5px", 
                      background: node.id === selectedNodeId ? "#3498db" : "#444",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold" }}>{node.name}</div>
                      <div style={{ fontSize: "12px", opacity: 0.8 }}>{node.url}</div>
                    </div>
                    <div>
                      {node.id !== selectedNodeId && (
                        <button
                          onClick={() => handleSelectNode(node.id)}
                          style={{
                            padding: "5px 10px",
                            background: "#2ecc71",
                            border: "none",
                            borderRadius: "4px",
                            color: "white",
                            cursor: "pointer",
                            marginRight: "5px"
                          }}
                        >
                          使用
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        style={{
                          padding: "5px 10px",
                          background: "#e74c3c",
                          border: "none",
                          borderRadius: "4px",
                          color: "white",
                          cursor: "pointer"
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <h3>添加新节点</h3>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="节点名称"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "5px",
                  background: "#333",
                  border: "none",
                  borderRadius: "4px",
                  color: "white"
                }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="节点URL"
                value={newNodeUrl}
                onChange={(e) => setNewNodeUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "10px",
                  background: "#333",
                  border: "none",
                  borderRadius: "4px",
                  color: "white"
                }}
              />
            </div>
            <button
              onClick={handleAddNode}
              style={{
                padding: "8px 16px",
                background: "#2ecc71",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer"
              }}
            >
              添加节点
            </button>
          </div>
        </>
      ) : (
        /* 文件管理界面 */
        <>
          <div style={{ marginBottom: "20px" }}>
            <h3>上传新文件</h3>
            <IpfsFileUpload onFileUploaded={handleFileUploaded} />
          </div>
          
          <IpfsFileList onFileSelect={handleFileSelect} />
        </>
      )}
      
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "block",
          padding: "8px 16px",
          background: "#3498db",
          border: "none",
          borderRadius: "4px",
          color: "white",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        返回
      </button>
    </div>
  );
} 