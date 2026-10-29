import { useEffect, useState } from 'react';

// Polls the server's /health route until it answers. On a free-tier host the server
// sleeps when idle, and this both wakes it and tells the UI when it's ready.
export function useServerStatus(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        async function check() {
            try {
                const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/health`, {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(8000),
                });
                if (res.ok) {
                    if (!cancelled) setReady(true);
                    return;
                }
            } catch {
                // server still waking up (timeout / network error) - try again below
            }
            if (!cancelled) timer = setTimeout(check, 2000);
        }

        check();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    return ready;
}
