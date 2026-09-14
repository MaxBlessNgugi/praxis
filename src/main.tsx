import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import favicon from './assets/brand/favicon-64.png';

// The tab icon is imported rather than linked from index.html: Vite hashes a linked icon into a
// separate file, and the share build has to stay one self-contained HTML file.
const icon = document.createElement('link');
icon.rel = 'icon';
icon.type = 'image/png';
icon.href = favicon;
document.head.appendChild(icon);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
