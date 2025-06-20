// src/hooks/useSupabaseStatus.ts
import { useEffect, useState } from 'react';

export const useSupabaseStatus = (pollInterval = 10000) => {
  const [isDown, setIsDown] = useState(false);

  useEffect(() => {
    const check = async () => {
      console.log('[SupabaseStatus] Checking...');
      try {
        const res = await fetch('https://vxfdnelgeczafzkwbreh.supabase.co/rest/v1/?', {
          method: 'OPTIONS',
        });

        if (!res.ok) {
          throw new Error('Status code: ${res.status}');
        }

        setIsDown(false);
      } catch (err) {
        console.error('[SupabaseStatus] Supabase down:', err);
        setIsDown(true);
      }
    };

    check();
    const interval = setInterval(check, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return isDown;
};
