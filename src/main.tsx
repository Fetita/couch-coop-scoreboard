import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { requestPersistentStorage } from './store/persistence';
import { startSync } from './sync';
import './styles.css';

void requestPersistentStorage();
startSync();

// Actualización automática: al volver a la app se fija si hay una versión nueva
// y, si la hay, recarga sola. Así no queda una versión vieja guardada en el teléfono.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => registration.update().catch(() => undefined);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check();
    });
    setInterval(check, 30 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
