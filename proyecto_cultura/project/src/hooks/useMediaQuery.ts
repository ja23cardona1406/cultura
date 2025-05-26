import { useState, useEffect } from 'react';

// Hook genérico para cualquier media query
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Hook para detectar mobile (menos de 640px)
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

// Hook para detectar tablet (640px - 1023px)
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
}

// Hook para detectar desktop (1024px o más)
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
