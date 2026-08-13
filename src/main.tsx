import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
// Provider registration side effects
import '@/lib/providers/directProvider';
import '@/lib/providers/youtubeProvider';
import '@/lib/providers/oshoworldProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
