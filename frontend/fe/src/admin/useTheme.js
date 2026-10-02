import { useCallback, useState } from 'react';

const KEY = 'admin-theme';

const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

// null = follow the operating system; 'light' / 'dark' = the viewer's explicit choice.
export function useTheme() {
  const [choice, setChoice] = useState(read);
  const systemDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const effective = choice ?? (systemDark ? 'dark' : 'light');

  const toggle = useCallback(() => {
    const next = effective === 'dark' ? 'light' : 'dark';
    setChoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* the choice just won't persist */
    }
  }, [effective]);

  return { choice, effective, toggle };
}
