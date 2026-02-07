
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Iniciando index.tsx...");

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Erro crítico: Elemento #root não encontrado no DOM.");
}
