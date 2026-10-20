/**
 * useApi Hook - Manages API calls with auth token
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface UseApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  execute: () => Promise<T | null>;
}

export function useApi<T = any>(
  url: string,
  options: UseApiOptions = {}
): UseApiResponse<T> {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (): Promise<T | null> => {
    if (!token) {
      setError('No authentication token');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API error');
      }

      const responseData = await response.json();
      setData(responseData.data);
      return responseData.data;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, url, options]);

  return {
    data,
    error,
    loading,
    execute,
  };
}
