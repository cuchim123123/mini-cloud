import { useCallback, useEffect, useState } from 'react';

export function useAsyncResource(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    reload: execute
  };
}
