/**
 * 用户信息组件
 * 展示当前用户的信息和状态
 */

import { useUser } from '@/contexts/UserContext';

export default function UserInfo() {
  const { user, loading, error } = useUser();

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        加载用户信息...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        错误: {error}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statusText = {
    free: '免费用户',
    basic: '基础包用户',
    premium: '尊享包用户',
  };

  return (
    <div className="text-sm text-gray-700">
      <div>状态: {statusText[user.payment_status]}</div>
      <div>剩余重生成次数: {user.regenerate_count}</div>
    </div>
  );
}
