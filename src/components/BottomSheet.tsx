import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';
import styles from './BottomSheet.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** replaces the close button, e.g. a "Clear" link; the backdrop still closes the sheet */
  headerAction?: ReactNode;
  /** pinned under the scrolling body, e.g. "Show 214 expenses" */
  footer?: ReactNode;
}

export function BottomSheet({ title, onClose, children, headerAction, footer }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Rendered into <body>, so it covers the navigation bar whatever screen opens it.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          {headerAction ?? (
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
