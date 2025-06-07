
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { HashRouter } from 'react-router-dom';
// import 'uuid'; // Removed: Ensure uuid/v4 is bundled if GameContext relies on it at module load time. (utils.ts handles specific import)

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <GameProvider>
        <App />
      </GameProvider>
    </HashRouter>
  </React.StrictMode>
);
