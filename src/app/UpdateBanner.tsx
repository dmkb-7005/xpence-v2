import { useRegisterSW } from 'virtual:pwa-register/react';

/** Updates are never applied silently, so the app cannot change mid-entry. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="banner" role="status">
      <span>Update available</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>Reload</button>
    </div>
  );
}
