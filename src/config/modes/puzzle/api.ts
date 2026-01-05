import { ApiConfig } from '../types';

export const PUZZLE_API_CONFIG: Record<string, ApiConfig> = {
  generate: {
    endpoint: '/api/generate-art-photo',
    method: 'POST',
    timeout: 30000,
    retryCount: 2
  },
  getStatus: {
    endpoint: '/api/task-status',
    method: 'GET',
    timeout: 10000,
    retryCount: 3
  },
  uploadImage: {
    endpoint: '/api/upload-image',
    method: 'POST',
    timeout: 60000,
    retryCount: 1
  }
};
