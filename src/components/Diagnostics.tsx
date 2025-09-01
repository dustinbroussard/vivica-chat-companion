import { useEffect, useState } from 'react';

type DiagnosticEvent = {
  rid?: string;
  model?: string;
  endpoint?: string;
  status?: number;
  elapsed?: number;
  kind?: string;
  retryAfterMs?: number;
};

export function Diagnostics() {
  const [data, setData] = useState<DiagnosticEvent>({});

  useEffect(() => {
    const onReq = (e: Event) => setData(prev => ({ ...prev, ...(e as CustomEvent).detail }));
    const onRes = (e: Event) => setData(prev => ({ ...prev, ...(e as CustomEvent).detail }));
    const onErr = (e: Event) => setData(prev => ({ ...prev, ...(e as CustomEvent).detail }));
    window.addEventListener('ai:request' as any, onReq);
    window.addEventListener('ai:response' as any, onRes);
    window.addEventListener('ai:error' as any, onErr);
    return () => {
      window.removeEventListener('ai:request' as any, onReq);
      window.removeEventListener('ai:response' as any, onRes);
      window.removeEventListener('ai:error' as any, onErr);
    };
  }, []);

  if (!localStorage.getItem('vivica-show-diagnostics')) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-xs p-3 rounded-md bg-card/90 border border-border shadow">
      <div><strong>Diagnostics</strong></div>
      {data.rid && <div>RID: {data.rid}</div>}
      {data.model && <div>Model: {data.model}</div>}
      {data.status !== undefined && <div>Status: {data.status}</div>}
      {data.elapsed !== undefined && <div>Elapsed: {data.elapsed}ms</div>}
      {data.kind && <div>Error: {data.kind}</div>}
      {data.retryAfterMs ? <div>Retry in: {Math.ceil(data.retryAfterMs/1000)}s</div> : null}
    </div>
  );
}

