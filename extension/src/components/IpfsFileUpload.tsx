import React, { useState, useRef } from 'react';
import { IpfsFile } from '../utils/chromeApi';
import localforage from 'localforage';

// 初始化localforage实例
const ipfsFilesStore = localforage.createInstance({
  name: 'ipfs-files',
  storeName: 'files'
});

interface IpfsFileUploadProps {
  onFileUploaded?: (file: IpfsFile) => void;
}

const IpfsFileUpload: React.FC<IpfsFileUploadProps> = ({ onFileUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  // 生成随机IPFS CID (模拟)
  const generateFakeCid = (): string => {
    // IPFS CID v1格式通常以 "bafy" 开头
    return 'bafybeie' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // 读取文件内容为ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('无法读取文件'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    try {
      // 模拟上传延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成CID
      const cid = generateFakeCid();
      
      // 读取文件内容
      const fileContent = await readFileAsArrayBuffer(file);
      
      // 创建文件记录
      const ipfsFile: IpfsFile = {
        cid,
        name: file.name,
        size: file.size,
        timestamp: Date.now()
      };
      
      // 存储文件元数据到历史记录
      try {
        // 获取现有历史记录
        const files = await ipfsFilesStore.getItem<IpfsFile[]>('uploadHistory') || [];
        
        // 添加新文件到历史记录
        const updatedFiles = [ipfsFile, ...files].slice(0, 50); // 只保留最近50个
        await ipfsFilesStore.setItem('uploadHistory', updatedFiles);
        
        // 存储文件内容
        await ipfsFilesStore.setItem(`file:${cid}`, {
          content: fileContent,
          type: file.type
        });
        
        // 触发回调
        if (onFileUploaded) {
          onFileUploaded(ipfsFile);
        }
      } catch (storageError) {
        console.error('存储文件失败:', storageError);
        throw new Error('存储文件失败');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError((err as Error).message || '上传失败');
    } finally {
      setIsUploading(false);
      // 清除input的值，允许重新上传相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{
      marginBottom: '24px',
      width: '100%'
    }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#3b99fc' : '#555'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? 'rgba(59, 153, 252, 0.1)' : '#2a2a2a',
          transition: 'all 0.2s ease'
        }}
        onClick={handleButtonClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {isUploading ? (
          <div>
            <div style={{ marginBottom: '10px' }}>上传中...</div>
            <div style={{
              width: '40px',
              height: '40px',
              margin: '0 auto',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              borderTop: '4px solid #3b99fc',
              animation: 'spin 1s linear infinite'
            }} />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#fff' }}>
              拖拽文件到此处 或 点击上传
            </div>
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              文件将通过IPFS分享，上传完成后会返回CID
            </div>
          </>
        )}
      </div>
      
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
    </div>
  );
};

export default IpfsFileUpload; 