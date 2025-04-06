import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../utils/chromeApi';

const CreateAccount: React.FC = () => {
  const [accountName, setAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 组件加载时检查是否需要自动创建默认账户
  useEffect(() => {
    const checkForAccounts = async () => {
      try {
        // 自动生成随机地址
        const existingAccounts = localStorage.getItem('accounts');
        if (!existingAccounts) {
          // 如果本地没有账户数据，创建默认账户
          setAccountName('我的账户');
          setIsCreating(true);
          
          // 创建一个默认账户，直接使用LocalStorage来简化逻辑
          const randomAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
          const defaultAccount = {
            id: "1",
            name: "我的账户",
            address: randomAddress
          };
          
          // 保存到localStorage
          localStorage.setItem('accounts', JSON.stringify([defaultAccount]));
          localStorage.setItem('currentAccountId', "1");
          
          // 延迟跳转，让用户看到创建过程
          setTimeout(() => {
            navigate('/home');
          }, 1000);
        }
      } catch (error) {
        console.error('自动创建账户失败:', error);
        setError('自动创建账户失败，请手动创建');
        setIsCreating(false);
      }
    };

    checkForAccounts();
  }, [navigate]);

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      setError('请输入账户名称');
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      // 创建新账户，生成随机地址
      const randomAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 获取现有账户
      const existingAccountsJson = localStorage.getItem('accounts');
      const existingAccounts = existingAccountsJson ? JSON.parse(existingAccountsJson) : [];
      
      // 创建新账户ID
      const newId = (existingAccounts.length + 1).toString();
      
      // 添加新账户
      const newAccount = {
        id: newId,
        name: accountName,
        address: randomAddress
      };
      
      existingAccounts.push(newAccount);
      
      // 保存到localStorage
      localStorage.setItem('accounts', JSON.stringify(existingAccounts));
      localStorage.setItem('currentAccountId', newId);

      // 导航回主页
      navigate('/home');
    } catch (error) {
      console.error('创建账户失败:', error);
      setError('创建账户失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#1c1c1c',
      color: 'white',
      padding: '40px',
      borderRadius: '16px',
      maxWidth: '400px',
      margin: '0 auto',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        fontSize: '24px'
      }}>
        创建新账户
      </h1>

      {error && (
        <div style={{
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          账户名称
        </label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="请输入账户名称"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2a2a2a',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: '15px'
      }}>
        <button
          onClick={() => navigate('/home')}
          disabled={isCreating}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#555',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            fontSize: '16px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.7 : 1
          }}
        >
          取消
        </button>
        <button
          onClick={handleCreateAccount}
          disabled={isCreating}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: '#3b99fc',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.7 : 1
          }}
        >
          {isCreating ? '创建中...' : '创建'}
        </button>
      </div>
    </div>
  );
};

export default CreateAccount; 