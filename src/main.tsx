import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App'
import '../index.css'
import { GameProvider } from '../contexts/GameContext'
import { HashRouter } from 'react-router-dom'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HashRouter>
      <GameProvider>
        <App />
      </GameProvider>
    </HashRouter>
  </React.StrictMode>,
)
