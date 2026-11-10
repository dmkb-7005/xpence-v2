import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './Snackbar.module.css';

export interface SnackbarOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarApi {
  show: (options: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}

const VISIBLE_MS = 6000;

/** One message at a time. It survives navigation, so "Deleted, Undo" can outlive the screen that deleted. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(SnackbarOptions & { id: number }) | null>(null);
  const counter = useRef(0);

  const show = useCallback((options: SnackbarOptions) => {
    counter.current += 1;
    setCurrent({ ...options, id: counter.current });
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      {current && (
        <div className={styles.snackbar} role="status">
          <span>{current.message}</span>
          {current.actionLabel && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                current.onAction?.();
                setCurrent(null);
              }}
            >
              {current.actionLabel}
            </button>
          )}
        </div>
      )}
    </SnackbarContext.Provider>
  );
}
