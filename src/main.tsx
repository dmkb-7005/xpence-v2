import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { db } from './db/db';
import { ensureDefaults } from './db/meta';
import './styles/global.css';

async function start() {
  await ensureDefaults(db);
  // Only reduces eviction pressure; backups remain essential.
  void navigator.storage?.persist?.();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
