import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@msanagu/pearl/index.css';
import App from './App.tsx';

// No fixed theme class here — App.tsx owns theme state (the switcher needs
// to change it at runtime), so the themed wrapper lives there instead.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
