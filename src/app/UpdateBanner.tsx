import { useRegisterSW } from 'virtual:pwa-register/react';
import { UploadIcon } from '../components/icons';
import styles from './UpdateDialog.module.css';

/**
 * Updates are never applied silently, so the app cannot change mid-entry. A new version
 * shows a dialog over everything; "Ignore" hides it until the next time the app starts.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-text">
        <span className={styles.icon}><UploadIcon size={24} /></span>
        <h2 id="update-title" className={styles.title}>Update available</h2>
        <p id="update-text" className={styles.text}>
          A new version of Xpence is ready. Reloading takes a second; anything you haven't saved yet on this screen is lost.
        </p>
        <div className={styles.buttons}>
          <button type="button" className={styles.ignore} onClick={() => setNeedRefresh(false)}>Ignore</button>
          <button type="button" className={styles.reload} autoFocus onClick={() => void updateServiceWorker(true)}>Reload</button>
        </div>
      </div>
    </div>
  );
}
