import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ClockIcon, CloseIcon, FilterIcon, ListIcon, PlusIcon, SearchIcon } from '../../components/icons';
import { useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { db } from '../../db/db';
import { useUsageCounts } from '../../db/hooks';
import { todayIso } from '../../domain/dates';
import {
  activeFilterCount, DATE_PRESETS, EMPTY_FILTER, groupByMonth, makeMatcher, monthHeader, type DatePreset, type ExpenseFilter,
} from '../../domain/expenseFilter';
import { formatCents } from '../../domain/money';
import { sortByUsage } from '../../domain/usage';
import { ExpenseRow } from './ExpenseRow';
import { ColourSheet, DateSheet, OptionSheet } from './FilterSheets';
import { useLongPress } from './useLongPress';
import styles from './Expenses.module.css';

const PAGE = 60;

/** Kept across visits, so returning from an edit restores filters and position. */
let memory: { filter: ExpenseFilter; filtersOpen: boolean; scrollTop: number; renderCount: number } | null = null;

const isPreset = (v: string | null): v is DatePreset => DATE_PRESETS.some((p) => p.id === v);
const dmShort = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;
const plural = (n: number, one: string, many: string) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;

type Sheet = 'date' | 'type' | 'group' | 'colour' | null;

export function ExpensesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = todayIso();

  // `?range=this-month` (from Home) starts a fresh, filtered view; otherwise restore the last one.
  const [initial] = useState(() => {
    const range = params.get('range');
    if (isPreset(range)) return { filter: { ...EMPTY_FILTER, preset: range }, filtersOpen: false, scrollTop: 0, renderCount: PAGE };
    return memory ?? { filter: EMPTY_FILTER, filtersOpen: false, scrollTop: 0, renderCount: PAGE };
  });
  useEffect(() => {
    if (params.has('range')) setParams({}, { replace: true });
  }, [params, setParams]);

  const [filter, setFilter] = useState<ExpenseFilter>(initial.filter);
  const [queryInput, setQueryInput] = useState(initial.filter.query);
  const [filtersOpen, setFiltersOpen] = useState(initial.filtersOpen);
  const [renderCount, setRenderCount] = useState(initial.renderCount);
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  /** exclusion mode: ids left out of the running total; null = mode off */
  const [excluded, setExcluded] = useState<ReadonlySet<string> | null>(null);
  const totalPress = useLongPress(() => {
    setExcluded((ex) => (ex ? null : new Set()));
  });
  const [sheet, setSheet] = useState<Sheet>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useSnackbarPlacement(NAV_HEIGHT + 16, 84); // beside the round Add button

  const expenses = useLiveQuery(async () => {
    const rows = await db.expenses.toArray();
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }, []);
  const types = useLiveQuery(() => db.expenseTypes.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const colors = useLiveQuery(() => db.colors.toArray(), []);
  const typeUsage = useUsageCounts('expenseTypeId');
  const groupUsage = useUsageCounts('groupId');

  // search is applied 200 ms after typing stops
  useEffect(() => {
    const t = window.setTimeout(() => setFilter((f) => (f.query === queryInput ? f : { ...f, query: queryInput })), 200);
    return () => window.clearTimeout(t);
  }, [queryInput]);

  const filtered = useMemo(() => (expenses ? expenses.filter(makeMatcher(filter, today)) : []), [expenses, filter, today]);
  const monthGroups = useMemo(() => groupByMonth(filtered, today), [filtered, today]);
  const countFor = useCallback((f: ExpenseFilter) => (expenses ? expenses.filter(makeMatcher(f, today)).length : 0), [expenses, today]);

  // a new filter starts at the top
  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) { firstFilter.current = false; return; }
    setRenderCount(PAGE);
    listRef.current?.scrollTo({ top: 0 });
  }, [filter]);

  // infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setRenderCount((c) => (c < filtered.length ? c + PAGE : c));
      },
      { root: listRef.current, rootMargin: '600px 0px' },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [filtered.length, expenses]);

  // restore the scroll position once the rows are there; remember state on leave
  useLayoutEffect(() => {
    if (restored.current || !expenses || !listRef.current) return;
    restored.current = true;
    listRef.current.scrollTop = initial.scrollTop;
  }, [expenses, initial.scrollTop]);
  const latest = useRef({ filter, filtersOpen, renderCount });
  latest.current = { filter, filtersOpen, renderCount };
  useEffect(() => () => {
    memory = { ...latest.current, scrollTop: listRef.current?.scrollTop ?? 0 };
  }, []);

  const filtersActive = activeFilterCount(filter) + (filter.query ? 1 : 0) > 0;
  useEffect(() => {
    if (!filtersActive) setExcluded(null);
  }, [filtersActive]);

  const typeById = useMemo(() => new Map((types ?? []).map((t) => [t.id, t])), [types]);
  const groupById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
  const colorById = useMemo(() => new Map((colors ?? []).map((c) => [c.id, c])), [colors]);

  const open = useCallback((id: string) => navigate(`/expenses/${id}`), [navigate]);
  const toggle = useCallback((id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next.size === 0 ? null : next;
  }), []);
  const startSelect = useCallback((id: string) => setSelected(new Set([id])), []);
  const toggleExclude = useCallback((id: string) => setExcluded((s) => {
    if (!s) return s;
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const apply = (f: ExpenseFilter) => { setFilter(f); setSheet(null); };

  if (!expenses || !types || !groups || !colors) return <div className={styles.screen} />;

  const selectMode = selected !== null;
  const filterCount = activeFilterCount(filter) + (filter.query ? 1 : 0);
  const anyFilter = filterCount > 0;
  const total = filtered.reduce((s, e) => s + e.amountCents, 0);
  const excludeMode = excluded !== null && !selectMode;
  const excludedRows = excluded ? filtered.filter((e) => excluded.has(e.id)) : [];
  const runningTotal = total - excludedRows.reduce((s, e) => s + e.amountCents, 0);
  const selectedTotal = selected ? expenses.reduce((s, e) => (selected.has(e.id) ? s + e.amountCents : s), 0) : 0;

  // ---------- empty: nothing stored at all ----------
  if (expenses.length === 0) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}><h1 className={styles.title}>Expenses</h1></header>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><ListIcon size={28} /></span>
          <div className={styles.emptyTitle}>No expenses yet</div>
          <div className={styles.emptyText}>Everything you add shows up here, newest first.</div>
          <div className={styles.emptyActions}>
            <Link className={styles.pillPrimary} to="/expenses/new">Add expense</Link>
            <Link className={styles.pillSecondary} to="/setup">Restore backup</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- filter chips ----------
  const range = filter.preset ? null : filter.range;
  const dateLabel = filter.preset
    ? DATE_PRESETS.find((p) => p.id === filter.preset)!.label
    : range ? `${dmShort(range.from)} – ${dmShort(range.to)}` : null;
  const listLabel = (ids: readonly string[], byId: Map<string, { name: string }>, many: string) =>
    ids.length === 0 ? null : ids.length === 1 ? (byId.get(ids[0]!)?.name ?? '1 ' + many) : `${ids.length} ${many}`;
  const chips: { key: Sheet; label: string; active: string | null; clear: () => void }[] = [
    { key: 'date', label: 'Date', active: dateLabel, clear: () => setFilter((f) => ({ ...f, preset: null, range: null })) },
    { key: 'type', label: 'Type', active: listLabel(filter.typeIds, typeById, 'types'), clear: () => setFilter((f) => ({ ...f, typeIds: [] })) },
    { key: 'group', label: 'Group', active: listLabel(filter.groupIds, groupById, 'groups'), clear: () => setFilter((f) => ({ ...f, groupIds: [] })) },
    { key: 'colour', label: 'Colour', active: listLabel(filter.colorIds, colorById, 'colours'), clear: () => setFilter((f) => ({ ...f, colorIds: [] })) },
  ];

  // ---------- rows, limited to renderCount ----------
  let budget = renderCount;
  const visibleGroups = [];
  for (const g of monthGroups) {
    if (budget <= 0) break;
    visibleGroups.push({ ...g, shown: g.rows.slice(0, budget) });
    budget -= g.rows.length;
  }

  return (
    <div className={styles.screen}>
      {selectMode ? (
        <header className={`${styles.header} ${styles.headerSelect}`}>
          <button type="button" className={styles.iconButton} aria-label="Exit selection" onClick={() => setSelected(null)}><CloseIcon size={22} /></button>
          <h1 className={styles.titleSelect}>{selected?.size ?? 0} selected</h1>
          <button type="button" className={styles.textButton} onClick={() => setSelected(new Set(filtered.map((e) => e.id)))}>Select all</button>
        </header>
      ) : (
        <header className={styles.header}>
          <h1 className={styles.title}>Expenses</h1>
          <button type="button" className={styles.filterButton} aria-label="Filters" aria-pressed={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
            <FilterIcon />
            {!filtersOpen && anyFilter && <span className={styles.count}>{filterCount}</span>}
          </button>
        </header>
      )}

      {filtersOpen && !selectMode ? (
        <>
          <label className={styles.search}>
            <SearchIcon />
            <input
              className={styles.searchInput} type="search" placeholder="Search remarks" enterKeyHint="search"
              value={queryInput} onChange={(e) => setQueryInput(e.target.value)}
            />
            {queryInput && (
              <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => setQueryInput('')}>
                <CloseIcon size={18} />
              </button>
            )}
          </label>
          <div className={styles.chips}>
            {chips.map((c) => c.active ? (
              <span key={c.key} className={styles.chipActive}>
                <button type="button" className={styles.chipActiveLabel} onClick={() => setSheet(c.key)}>{c.active}</button>
                <button type="button" className={styles.chipClear} aria-label={`Clear ${c.label.toLowerCase()} filter`} onClick={c.clear}>
                  <span><CloseIcon size={10} /></span>
                </button>
              </span>
            ) : (
              <button key={c.key} type="button" className={styles.chip} onClick={() => setSheet(c.key)}>
                {c.label}<ChevronDown size={14} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.gap} />
      )}

      <div className={styles.list} ref={listRef}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><SearchIcon size={28} /></span>
            {filter.query ? (
              <>
                <div className={styles.emptyTitle}>No expenses match “{filter.query}”</div>
                <div className={styles.emptyText}>Search looks in remarks only, within the filters you set.</div>
                <div className={styles.emptyActions}>
                  <button type="button" className={styles.pillSecondary} onClick={() => setQueryInput('')}>Clear search</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.emptyTitle}>No expenses match these filters</div>
                <div className={styles.emptyActions}>
                  <button type="button" className={styles.pillSecondary} onClick={() => { setFilter(EMPTY_FILTER); setQueryInput(''); }}>Clear filters</button>
                </div>
              </>
            )}
          </div>
        ) : (
          visibleGroups.map((g) => (
            <section key={g.month} aria-label={monthHeader(g.month)}>
              <div className={styles.monthHeader}>
                <span className={styles.monthName}>{monthHeader(g.month)}</span>
                <span className={styles.monthTotal}>{g.allScheduled && <ClockIcon size={12} />}{formatCents(g.totalCents)}</span>
              </div>
              <div className={styles.group}>
                {g.shown.map((e) => {
                  const color = e.colorId ? colorById.get(e.colorId) ?? null : null;
                  return (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      typeName={typeById.get(e.expenseTypeId)?.name ?? '—'}
                      groupName={e.groupId ? groupById.get(e.groupId)?.name ?? null : null}
                      color={color}
                      scheduled={e.date > today}
                      selectMode={selectMode}
                      selected={selected?.has(e.id) ?? false}
                      excludeMode={excludeMode}
                      excluded={excludeMode && (excluded?.has(e.id) ?? false)}
                      onOpen={open}
                      onToggle={toggle}
                      onStartSelect={startSelect}
                      onToggleExclude={toggleExclude}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
        <div ref={sentinelRef} className={styles.sentinel} />
        {renderCount < filtered.length && <div className={styles.loadingMore}>Loading more…</div>}
      </div>

      <div className={styles.bottom}>
        {selectMode ? (
          <div className={`${styles.total} ${styles.totalSelected}`} role="status">
            <span className={styles.totalLabel}>{selected?.size ?? 0} selected</span>
            <span className={styles.totalValue}>{formatCents(selectedTotal)}</span>
          </div>
        ) : (
          <>
            {anyFilter && (
              // hold the total to start or end exclusion mode
              <button
                type="button"
                className={`${styles.total} ${styles.totalButton} ${excludeMode ? styles.totalExclude : ''}`}
                aria-live="polite"
                aria-label={excludeMode
                  ? `Total ${formatCents(runningTotal)} without ${excludedRows.length} excluded. Hold to finish excluding.`
                  : `Total ${formatCents(total)} for ${filtered.length} expenses. Hold to exclude single expenses.`}
                {...totalPress.handlers}
                onClick={() => { totalPress.consumed(); }}
              >
                <span className={styles.totalLabel}>
                  {!excludeMode && plural(filtered.length, 'expense', 'expenses')}
                  {excludeMode && excludedRows.length === 0 && <>Tap expenses to exclude<span className={styles.totalSub}>Hold here to finish</span></>}
                  {excludeMode && excludedRows.length > 0 && (
                    <>{excludedRows.length} excluded<span className={styles.totalSub}>of {plural(filtered.length, 'expense', 'expenses')} · hold to finish</span></>
                  )}
                </span>
                <span className={styles.totalValue}>{formatCents(excludeMode ? runningTotal : total)}</span>
              </button>
            )}
            {!excludeMode && <Link className={styles.fab} to="/expenses/new" aria-label="Add expense"><PlusIcon size={24} /></Link>}
          </>
        )}
      </div>

      {sheet === 'date' && <DateSheet filter={filter} today={today} countFor={countFor} onApply={apply} onClose={closeSheet} />}
      {(sheet === 'type' || sheet === 'group') && (
        <OptionSheet
          title={sheet === 'type' ? 'Type' : 'Group'}
          field={sheet === 'type' ? 'typeIds' : 'groupIds'}
          options={sortByUsage(sheet === 'type' ? types : groups, (sheet === 'type' ? typeUsage : groupUsage) ?? new Map())
            .map((o) => ({ id: o.id, name: o.name, hidden: o.hidden, count: ((sheet === 'type' ? typeUsage : groupUsage) ?? new Map()).get(o.id) ?? 0 }))}
          filter={filter} today={today} countFor={countFor} onApply={apply} onClose={closeSheet}
        />
      )}
      {sheet === 'colour' && (
        <ColourSheet colors={[...colors].sort((a, b) => a.sortOrder - b.sortOrder)} filter={filter} countFor={countFor} onApply={apply} onClose={closeSheet} />
      )}
    </div>
  );
}
