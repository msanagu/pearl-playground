import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { pearlLightThemeClass, pearlExtensionClass, color, fontFamily } from '@msanagu/pearl';
import '@msanagu/pearl/index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div
      className={`${pearlLightThemeClass} ${pearlExtensionClass}`}
      style={{ color: color.text, background: color.background, fontFamily: fontFamily.body, minHeight: '100vh' }}
    >
      <App />
    </div>
  </StrictMode>,
);
