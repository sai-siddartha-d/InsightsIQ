// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { installMockConsoleHelpers } from './mocks';

// Static demo build: there is no backend. The mock store in src/mocks/ serves
// every API call from seeded data held in localStorage.
installMockConsoleHelpers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
