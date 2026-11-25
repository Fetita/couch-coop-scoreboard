import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onBlocked } from '../store/store';
import { useSyncStatus } from '../sync/status';
import { Icon } from './Icon';

/** Aviso arriba para los que solo miran, y un cartelito si intentan cambiar algo. */
export function SyncBanner() {
  const status = useSyncStatus();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onBlocked((msg) => {
      setToast(msg);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3500);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {status.role === 'viewer' && (
        <Link to="/ajustes" className="sync-banner">
          <Icon name="users" size={16} />
          <span className="grow">Mirando en vivo lo que anota el organizador{status.online ? '' : ' · sin conexión'}</span>
        </Link>
      )}
      {status.role === 'editor' && ((status.pending && !status.online) || status.error) && (
        <Link to="/ajustes" className={`sync-banner${status.error ? ' error' : ''}`}>
          <Icon name="upload" size={16} />
          <span className="grow">{status.error ?? 'Sin conexión: los cambios se suben cuando vuelva internet'}</span>
        </Link>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
