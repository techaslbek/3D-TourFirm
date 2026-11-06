import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { debug } from './debug';
import { Scene } from './scene/Scene';
import { Ui } from './ui/Ui';
import './ui/styles.css';

window.addEventListener('error', (e) => debug.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => debug.errors.push(String(e.reason)));

function App() {
  return (
    <div className="app">
      <div className="viewport" data-testid="viewport">
        <Scene />
      </div>
      <Ui />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
