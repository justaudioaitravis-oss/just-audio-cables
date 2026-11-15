import './fonts.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';

const root = document.getElementById('app');
if (root) {
  const app = new App(root);
  // Exposed for debugging in the browser console only.
  (window as unknown as { cableApp: App }).cableApp = app;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({ immediate: true });
}
