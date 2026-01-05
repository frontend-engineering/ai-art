import { useParams, useLocation } from 'react-router-dom';
import { getModeConfig, ModeConfig } from '@/config/modes';

/**
 * 获取当前模式配置的Hook
 * 从URL路径中提取模式ID并返回对应配置
 */
export function useModeConfig(): ModeConfig | null {
  const location = useLocation();
  
  // 从路径中提取模式ID
  // 例如: /puzzle/upload -> puzzle
  const pathParts = location.pathname.split('/').filter(Boolean);
  const modeId = pathParts[0];
  
  return getModeConfig(modeId);
}

/**
 * 获取指定模式配置的Hook
 */
export function useSpecificModeConfig(modeId: string): ModeConfig | null {
  return getModeConfig(modeId);
}
