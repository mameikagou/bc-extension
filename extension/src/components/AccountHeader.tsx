import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Account } from '../utils/accountStorage';

interface AccountHeaderProps {
  currentAccount: Account;
  accounts: Account[];
  onAccountChange: (accountId: string) => void;
  onAccountDelete?: (accountId: string) => Promise<boolean>;
}

const AccountHeader: React.FC<AccountHeaderProps> = ({ 
  currentAccount, 
  accounts, 
  onAccountChange,
  onAccountDelete
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();
  
  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 5)}`;
  };
  
  // 切换下拉菜单显示
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // 选择账户
  const selectAccount = (accountId: string) => {
    onAccountChange(accountId);
    setIsDropdownOpen(false);
  };
  
  // 删除账户
  const handleDeleteAccount = async (accountId: string, event: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发选择账户
    event.stopPropagation();
    
    // 只有一个账户时不允许删除
    if (accounts.length <= 1) {
      setDeleteError('不能删除唯一的账户');
      return;
    }
    
    // 确认删除
    if (!window.confirm('确定要删除此账户吗？此操作无法撤销！')) {
      return;
    }
    
    if (onAccountDelete) {
      try {
        setIsDeleting(true);
        setDeleteError('');
        const success = await onAccountDelete(accountId);
        if (!success) {
          throw new Error('删除账户失败');
        }
        // 删除成功后自动关闭下拉菜单
        setIsDropdownOpen(false);
      } catch (error) {
        console.error('删除账户失败:', error);
        setDeleteError('删除账户失败，请重试');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <div style={{
      background: '#2a2a2a',
      padding: '15px',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      margin: '0 0 20px 0',
      position: 'relative'
    }}>
      <div 
        onClick={toggleDropdown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3498db, #9b59b6, #e74c3c, #f1c40f)',
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {currentAccount.icon || currentAccount.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: 'white' }}>{currentAccount.name}</div>
          </div>
        </div>
        <div style={{
          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s',
          color: 'white'
        }}>
          ▼
        </div>
      </div>
      
      <div style={{
        padding: '8px 0',
        color: '#aaa',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div>{formatAddress(currentAccount.address)}</div>
        <div 
          onClick={() => {
            navigator.clipboard.writeText(currentAccount.address);
          }}
          style={{
            marginLeft: '8px',
            cursor: 'pointer',
            color: '#3b99fc'
          }}
        >
          📋
        </div>
      </div>
      
      {isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1c1c1c',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          zIndex: 10,
          marginTop: '10px',
          padding: '12px'
        }}>
          {deleteError && (
            <div style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              {deleteError}
            </div>
          )}
          
          {accounts.map(account => (
            <div 
              key={account.id}
              style={{
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderRadius: '8px',
                background: account.id === currentAccount.id ? '#333' : 'transparent',
                marginBottom: '4px'
              }}
              onClick={() => selectAccount(account.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3498db, #9b59b6, #e74c3c, #f1c40f)',
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {account.icon || account.name.charAt(0)}
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontWeight: 'bold' }}>{account.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{formatAddress(account.address)}</div>
                </div>
              </div>
              
              {/* 删除按钮 */}
              {onAccountDelete && accounts.length > 1 && (
                <div
                  onClick={(e) => handleDeleteAccount(account.id, e)}
                  style={{
                    marginLeft: '8px',
                    color: '#e74c3c',
                    opacity: isDeleting ? 0.5 : 1,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {isDeleting ? '删除中...' : '删除'}
                </div>
              )}
            </div>
          ))}
          <div style={{
            borderTop: '1px solid #444',
            paddingTop: '12px',
            marginTop: '8px'
          }}>
            <button
              onClick={() => {
                navigate('/create-account');
                setIsDropdownOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              创建账户
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountHeader; 