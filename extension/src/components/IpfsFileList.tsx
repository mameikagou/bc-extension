import React, { useState, useEffect } from 'react';
import { IpfsFile, ipfsFileApi } from '../utils/chromeApi';

interface IpfsFileListProps {
  onFileSelect?: (file: IpfsFile) => void;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// 创建并下载文件
const createAndDownloadFile = (content: Uint8Array | ArrayBuffer, fileName: string, mimeType: string): void => {
  // 创建Blob
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  // 创建下载链接
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  
  // 触发下载
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

const IpfsFileList: React.FC<IpfsFileListProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<IpfsFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 获取并下载文件
  const handleGetFile = async (file: IpfsFile) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 从后台下载文件
      const fileData = await ipfsFileApi.downloadFile(file.cid);
      
      // 创建一个模拟文件内容用于下载
      const content = new TextEncoder().encode('模拟文件内容: ' + file.name);
      
      // 下载文件
      createAndDownloadFile(
        content, 
        file.name, 
        fileData.type || 'application/octet-stream'
      );
      
    } catch (err) {
      console.error('获取文件失败:', err);
      setError((err as Error).message || '获取文件失败');
      alert(`获取文件失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载文件历史
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 从后台获取上传历史
      const history = await ipfsFileApi.getHistory();
      setFiles(history || []);
    } catch (err) {
      console.error('加载历史记录失败:', err);
      setError((err as Error).message || '加载历史记录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 清除历史记录
  const handleClearHistory = async () => {
    if (window.confirm('确定要清除所有上传历史记录吗？这个操作无法撤销。')) {
      try {
        setIsLoading(true);
        setError(null);
        
        // 清除历史记录
        await ipfsFileApi.clearHistory();
        setFiles([]);
        
      } catch (err) {
        console.error('清除历史记录失败:', err);
        setError((err as Error).message || '清除历史记录失败');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 初始加载
  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, color: 'white' }}>上传历史</h3>
        {files.length > 0 && (
          <button
            onClick={handleClearHistory}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff5c5c',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            清除历史
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
          加载中...
        </div>
      )}

      {error && (
        <div style={{
          color: '#ff5c5c',
          padding: '8px',
          marginTop: '10px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {!isLoading && files.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
          暂无上传记录
        </div>
      )}

      {!isLoading && files.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px'
        }}>
          {files.map((file, index) => (
            <div 
              key={file.cid}
              style={{ 
                padding: '12px', 
                backgroundColor: '#333', 
                borderRadius: '8px',
                cursor: onFileSelect ? 'pointer' : 'default'
              }}
              onClick={() => onFileSelect && onFileSelect(file)}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '8px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: 'white',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={file.name}>
                  {file.name}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetFile(file);
                  }}
                  style={{
                    backgroundColor: '#3b99fc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  下载
                </button>
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                color: '#aaa', 
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={`CID: ${file.cid}`}>
                CID: {file.cid}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '12px',
                color: '#888',
                marginTop: '4px'
              }}>
                <div>{formatFileSize(file.size)}</div>
                <div>{file.uploadTime ? new Date(file.uploadTime).toLocaleString() : formatDate(file.timestamp || 0)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IpfsFileList; 