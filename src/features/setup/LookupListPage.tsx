import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BackIcon, ChevronRight, PlusIcon } from '../../components/icons';
import { useSnackbar, useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { db } from '../../db/db';
import { useUsageCounts } from '../../db/hooks';
import type { ExpenseType, Group, HighlightColor } from '../../db/schema';
import { sortByUsage } from '../../domain/usage';
import { LookupSheet, type LookupDraft, type LookupKind } from './LookupSheet';
import styles from './Setup.module.css';

const TITLE = { types: 'Expense types', groups: 'Groups', colours: 'Colours' } as const;
const PLURAL = { types: 'types', groups: 'groups', colours: 'colours' } as const;
const INDEX = { types: 'expenseTypeId', groups: 'groupId', colours: 'colorId' } as const;

type Item = ExpenseType | Group | HighlightColor;

export function LookupListPage({ kind }: { kind: LookupKind }) {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  useSnackbarPlacement(NAV_HEIGHT + 16);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const close = useCallback(() => setEditing(null), []);

  const table = kind === 'types' ? db.expenseTypes : kind === 'groups' ? db.groups : db.colors;
  const items = useLiveQuery(() => (table.toArray() as Promise<Item[]>), [kind]);
  const usage = useUsageCounts(INDEX[kind]);
  const typeUsage = useUsageCounts('expenseTypeId');
  const types = useLiveQuery(() => db.expenseTypes.toArray(), []);

  const sorted = useMemo(() => {
    if (!items) return [];
    if (kind === 'colours') return [...(items as HighlightColor[])].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortByUsage(items, usage ?? new Map());
  }, [items, usage, kind]);

  if (!items || !usage) return <div className={styles.screen} />;

  const hiddenCount = items.filter((i) => i.hidden).length;
  const previewType = types && typeUsage ? sortByUsage(types, typeUsage)[0]?.name ?? 'Alimentos' : 'Alimentos';
  const plural = (n: number) => `${n.toLocaleString('de-DE')} ${n === 1 ? 'expense' : 'expenses'}`;

  async function save(draft: LookupDraft) {
    const nowIso = new Date().toISOString();
    if (editing === 'new') {
      const id = crypto.randomUUID();
      if (kind === 'colours') {
        const maxOrder = Math.max(-1, ...(items as HighlightColor[]).map((c) => c.sortOrder));
        await db.colors.add({ id, name: draft.name, hex: draft.hex!, sortOrder: maxOrder + 1, hidden: false });
      } else {
        await (kind === 'types' ? db.expenseTypes : db.groups).add({ id, name: draft.name, hidden: false, createdAt: nowIso });
      }
      snackbar.show({ message: `${draft.name} added` });
    } else if (editing) {
      if (kind === 'colours') await db.colors.update(editing.id, { name: draft.name, hidden: draft.hidden, hex: draft.hex! });
      else await (kind === 'types' ? db.expenseTypes : db.groups).update(editing.id, { name: draft.name, hidden: draft.hidden });
      snackbar.show({ message: 'Saved' });
    }
    setEditing(null);
  }

  async function remove() {
    if (!editing || editing === 'new') return;
    // only offered when nothing uses the item; check again in case that changed
    const inUse = await db.expenses.where(INDEX[kind]).equals(editing.id).count();
    if (inUse > 0) { setEditing(null); return; }
    const deleted = editing;
    await table.delete(deleted.id);
    setEditing(null);
    snackbar.show({
      message: `${deleted.name} deleted`,
      actionLabel: 'Undo',
      onAction: () => void (kind === 'colours' ? db.colors.put(deleted as HighlightColor)
        : (kind === 'types' ? db.expenseTypes : db.groups).put(deleted as ExpenseType)),
    });
  }

  const current = editing && editing !== 'new' ? editing : null;

  return (
    <div className={styles.screen}>
      <header className={`${styles.header} ${styles.headerSub}`}>
        <button type="button" className={styles.back} aria-label="Back to Setup" onClick={() => navigate('/setup')}><BackIcon /></button>
        <h1 className={styles.title}>{TITLE[kind]}</h1>
        <button type="button" className={styles.addPill} onClick={() => setEditing('new')}><PlusIcon size={18} />Add</button>
      </header>
      <div className={styles.scroll}>
        {kind !== 'colours' && (
          <p className={styles.intro}>
            {items.length} {PLURAL[kind]}{hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}. Hidden {PLURAL[kind]} stay on old expenses but aren't offered when adding.
          </p>
        )}
        <section className={`${styles.card} ${styles.listCard}`}>
          {sorted.map((item) => {
            const used = usage.get(item.id) ?? 0;
            const colour = kind === 'colours' ? (item as HighlightColor) : null;
            return (
              <button key={item.id} type="button" className={styles.link} onClick={() => setEditing(item)}>
                {colour && <span className={styles.swatchDot} style={{ background: colour.hex, opacity: item.hidden ? 0.4 : 1 }} />}
                <span className={styles.itemName}>
                  <span className={item.hidden ? styles.hidden : undefined}>{item.name}</span>
                  {colour && <span className={styles.hex}>{colour.hex}</span>}
                  {item.hidden && <span className={styles.hiddenBadge}>Hidden</span>}
                </span>
                <span className={styles.usage}>{plural(used)}</span>
                <ChevronRight size={16} className={styles.chev} />
              </button>
            );
          })}
          {sorted.length === 0 && <p className={styles.settingText} style={{ padding: '14px 4px' }}>Nothing here yet. Tap Add to create the first one.</p>}
        </section>
      </div>

      {editing && (
        <LookupSheet
          key={current?.id ?? 'new'}
          kind={kind}
          existing={current ? { id: current.id, name: current.name, hidden: current.hidden, hex: kind === 'colours' ? (current as HighlightColor).hex : undefined } : null}
          usage={current ? usage.get(current.id) ?? 0 : 0}
          otherNames={items.filter((i) => i.id !== current?.id).map((i) => i.name)}
          previewType={previewType}
          onSave={(d) => void save(d)}
          onDelete={() => void remove()}
          onClose={close}
        />
      )}
    </div>
  );
}
