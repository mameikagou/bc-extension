import React, { useState, useEffect } from 'react';
import { IpfsFile } from '../utils/chromeApi';
import localforage from 'localforage';

// 获取相同的localforage实例
const ipfsFilesStore = localforage.createInstance({
  name: 'ipfs-files',
  storeName: 'files'
});

interface IpfsFileListProps {
  onFileSelect?: (file: IpfsFile) => void;
}

const IpfsFileList: React.FC<IpfsFileListProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<IpfsFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // 截断文件名，保留开头和扩展名
  const truncateFileName = (fileName: string, maxLength: number = 20): string => {
    if (fileName.length <= maxLength) return fileName;
    
    // 获取文件扩展名
    const lastDot = fileName.lastIndexOf('.');
    const ext = lastDot !== -1 ? fileName.slice(lastDot) : '';
    
    // 计算应保留的文件名前缀长度
    const prefixLength = maxLength - 3 - ext.length; // 3是"..."的长度
    
    if (prefixLength <= 0) {
      // 如果扩展名过长，只保留扩展名的前几个字符
      return fileName.slice(0, 3) + '...' + ext.slice(0, maxLength - 6) + '...';
    }
    
    return fileName.slice(0, prefixLength) + '...' + ext;
  };

  // 创建Blob URL并下载文件
  const createAndDownloadFile = (content: ArrayBuffer, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // 获取并下载文件
  const handleGetFile = async (file: IpfsFile) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 从localForage获取文件内容
      const fileData = await ipfsFilesStore.getItem<{ content: ArrayBuffer, type: string }>(`file:${file.cid}`);
      
      if (!fileData) {
        throw new Error('文件不存在或已被删除');
      }
      
      // 下载文件
      createAndDownloadFile(
        fileData.content, 
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
      
      // 从localForage获取上传历史
      const uploadHistory = await ipfsFilesStore.getItem<IpfsFile[]>('uploadHistory');
      setFiles(uploadHistory || []);
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
        
        // 获取所有文件CID
        const history = await ipfsFilesStore.getItem<IpfsFile[]>('uploadHistory') || [];
        
        // 清除每个文件
        for (const file of history) {
          await ipfsFilesStore.removeItem(`file:${file.cid}`);
        }
        
        // 清除历史记录
        await ipfsFilesStore.setItem('uploadHistory', []);
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

      {files.length > 0 && (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {files.map((file, index) => (
            <div
              key={file.cid}
              style={{
                padding: '12px',
                backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#333',
                borderRadius: '6px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                position: 'relative',
              }}
              onClick={() => onFileSelect && onFileSelect(file)}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <div 
                  style={{ 
                    color: 'white', 
                    fontWeight: 500,
                    maxWidth: '70%', 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={file.name} // 悬停时显示完整文件名
                >
                  {truncateFileName(file.name, 25)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetFile(file);
                  }}
                  style={{
                    background: '#3b99fc',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
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
                <div>{formatDate(file.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IpfsFileList; 