import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { CheckIcon, InfoIcon, TrashIcon } from '../../components/icons';
import { COLOR_PALETTE, normalizeHex, sameName } from '../../domain/setup';
import styles from './Sheets.module.css';

export type LookupKind = 'types' | 'groups' | 'colours';

export interface LookupDraft {
  name: string;
  hidden: boolean;
  hex?: string;
}

interface Props {
  kind: LookupKind;
  /** null when adding */
  existing: { id: string; name: string; hidden: boolean; hex?: string } | null;
  usage: number;
  otherNames: readonly string[];
  /** name of the most used type, for the colour preview */
  previewType: string;
  onSave: (draft: LookupDraft) => void;
  onDelete: () => void;
  onClose: () => void;
}

const NOUN = { types: 'type', groups: 'group', colours: 'colour' } as const;
const PICKER = { types: 'adding expenses', groups: 'adding expenses', colours: 'adding expenses' } as const;

export function LookupSheet({ kind, existing, usage, otherNames, previewType, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(existing?.name ?? '');
  const [hidden, setHidden] = useState(existing?.hidden ?? false);
  const [hexInput, setHexInput] = useState(existing?.hex ?? COLOR_PALETTE[0]);
  const noun = NOUN[kind];
  const hex = normalizeHex(hexInput);

  const trimmed = name.trim();
  const duplicate = otherNames.some((o) => sameName(o, trimmed));
  const problem = trimmed === '' ? 'Enter a name' : duplicate ? `Another ${noun} already has this name` : kind === 'colours' && !hex ? 'Enter a colour like #E6C860' : null;
  const title = existing ? (kind === 'colours' ? 'Edit colour' : `Rename ${noun}`) : `New ${noun}`;

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      headerAction={<span />}
      footer={
        <button type="button" className={styles.primary} style={{ width: '100%' }} disabled={problem !== null}
          onClick={() => onSave({ name: trimmed, hidden, hex: hex ?? undefined })}>
          Save
        </button>
      }
    >
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Name</span>
        <input className={styles.input} value={name} autoFocus={!existing} enterKeyHint="done" onChange={(e) => setName(e.target.value)} />
      </label>
      {name !== '' && problem && problem !== 'Enter a colour like #E6C860' && <p className={styles.error}>{problem}</p>}

      {kind === 'colours' && (
        <>
          <div className={styles.palette} role="group" aria-label="Colour">
            {COLOR_PALETTE.map((c) => (
              <button key={c} type="button" className={styles.paletteSwatch} style={{ background: c }} aria-label={c} aria-pressed={hex === c}
                onClick={() => setHexInput(c)}>
                {hex === c && <CheckIcon />}
              </button>
            ))}
          </div>
          <label className={styles.hexRow}>
            <span className={styles.hexDot} style={{ background: hex ?? 'transparent', border: hex ? 0 : '1.5px dashed var(--faint)' }} />
            <span className={styles.hexLabel}>Hex</span>
            <input className={styles.hexInput} value={hexInput} spellCheck={false} autoCapitalize="characters" maxLength={7}
              onChange={(e) => setHexInput(e.target.value)} />
          </label>
          {!hex && <p className={styles.error}>Enter a colour like #E6C860</p>}
          <div className={styles.preview} aria-label="Preview">
            <span className={styles.previewStripe} style={{ background: hex ?? 'transparent' }} />
            <span className={styles.previewName}>{previewType} <span>· preview</span></span>
            <span className={styles.previewAmount}>€42,22</span>
          </div>
        </>
      )}

      {existing && (
        <div className={styles.switchRow}>
          <div>
            <div className={styles.switchTitle}>Hidden</div>
            <div className={styles.switchText}>Not offered when {PICKER[kind]}</div>
          </div>
          <button type="button" role="switch" className={styles.switch} aria-checked={hidden} aria-label="Hidden" onClick={() => setHidden((h) => !h)}>
            <span />
          </button>
        </div>
      )}

      {existing && usage > 0 && (
        <div className={styles.info}>
          <InfoIcon size={16} />
          <span>Used by {usage.toLocaleString('de-DE')} {usage === 1 ? 'expense' : 'expenses'}, so it can be hidden but not deleted.</span>
        </div>
      )}
      {existing && usage === 0 && (
        <button type="button" className={styles.deleteButton} onClick={onDelete}><TrashIcon />Delete {noun}</button>
      )}
    </BottomSheet>
  );
}
