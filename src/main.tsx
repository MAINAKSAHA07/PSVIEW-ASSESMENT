import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const storedTheme = localStorage.getItem('agentforge-theme');
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  document.body.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
