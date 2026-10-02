import { useCallback, useEffect, useState } from 'react';
import { api, buildQuery } from '../api';

// GET a path with query params. While a new request is running the previous data stays in place
// (so charts keep their frame instead of flashing), and `loading` tells the page to dim it.
export function useFetch(path, params) {
  const url = `${path}${buildQuery(params)}`;
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(url)
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, error, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const mutate = useCallback((fn) => setState((s) => ({ ...s, data: s.data ? fn(s.data) : s.data })), []);
  return { ...state, reload, mutate };
}
