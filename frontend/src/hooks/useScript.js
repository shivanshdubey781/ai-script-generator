import { useState, useCallback } from 'react';
import { generateScript } from '../services/api';

export function useScript() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const generate = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateScript(formData);
      setResult(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to generate scripts. Please try again.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, error, result, generate, clear };
}
