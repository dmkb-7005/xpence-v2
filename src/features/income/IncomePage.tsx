import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpIcon, ChevronDown, ClockIcon, CloseIcon, FilterIcon, PlusIcon, SearchIcon } from '../../components/icons';
import { useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { db } from '../../db/db';
import { daysInMonth, monthKeyOf, parseMonthKey, todayIso } from '../../domain/dates';
import { DATE_PRESETS, groupByMonth, monthHeader, monthName } from '../../domain/expenseFilter';
import {
  countLabel, EMPTY_INCOME_FILTER, INCOME_KINDS, isIncomeFilterActive, makeIncomeMatcher, overviewYears, type IncomeFilter,
} from '../../domain/incomeFilter';
import { formatCents, formatPercent } from '../../domain/money';
import type { MonthSummary } from '../../domain/savings';
import { DateSheet } from '../expenses/FilterSheets';
import { IncomeRow } from './IncomeRow';
import ex from '../expenses/Expenses.module.css';
import styles from './Income.module.css';

/** Mode and filters survive leaving the tab or opening an entry. */
let memory: { entries: boolean; filter: IncomeFilter } = { entries: false, filter: EMPTY_INCOME_FILTER };

const dmShort = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;
const minus = (cents: number) => `−${formatCents(Math.abs(cents))}`;

function Pct({ value, inProgress = false }: { value: number | null; inProgress?: boolean }) {
  if (inProgress) return <span className={styles.progress}><ClockIcon size={15} strokeWidth={2.4} />In progress</span>;
  if (value === null) return <span className={`${styles.pct} ${styles.pctNone}`}>–</span>;
  return <span className={`${styles.pct} ${value < 0 ? styles.pctNeg : styles.pctPos}`}>{formatPercent(value)}</span>;
}

function Meter({ value }: { value: number | null }) {
  if (value === null || value <= 0) return <div className={styles.meter} aria-hidden="true" />;
  return <div className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

export function IncomePage() {
  const navigate = useNavigate();
  const today = todayIso();
  const [entries, setEntriesState] = useState(memory.entries);
  const [filter, setFilterState] = useState<IncomeFilter>(memory.filter);
  const [queryInput, setQueryInput] = useState(memory.filter.query);
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const [dateSheet, setDateSheet] = useState(false);
  const [stickyYear, setStickyYear] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const yearCards = useRef(new Map<number, HTMLElement>());
  useSnackbarPlacement(NAV_HEIGHT + 16, 84);

  const setEntries = (v: boolean) => { memory = { ...memory, entries: v }; setEntriesState(v); setSelected(null); };
  const setFilter = (f: IncomeFilter | ((f: IncomeFilter) => IncomeFilter)) =>
    setFilterState((prev) => { const next = typeof f === 'function' ? f(prev) : f; memory = { ...memory, filter: next }; return next; });

  useEffect(() => {
    const t = window.setTimeout(() => setFilter((f) => (f.query === queryInput ? f : { ...f, query: queryInput })), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const incomes = useLiveQuery(async () => {
    const rows = await db.incomes.toArray();
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }, []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);

  const years = useMemo(() => (incomes && expenses ? overviewYears(incomes, expenses, today) : []), [incomes, expenses, today]);
  const filtered = useMemo(() => (incomes ? incomes.filter(makeIncomeMatcher(filter, today)) : []), [incomes, filter, today]);
  const groups = useMemo(() => groupByMonth(filtered, today), [filtered, today]);
  const countFor = useCallback((f: IncomeFilter) => (incomes ? incomes.filter(makeIncomeMatcher(f, today)).length : 0), [incomes, today]);

  // overview: show the compact year bar once that year's card has scrolled away
  const onScroll = () => {
    const list = listRef.current;
    if (!list || entries) return;
    const top = list.getBoundingClientRect().top;
    let current: number | null = null;
    for (const y of years) {
      const card = yearCards.current.get(y.year);
      if (card && card.getBoundingClientRect().bottom < top + 8) current = y.year;
    }
    setStickyYear(current);
  };

  const open = useCallback((id: string) => navigate(`/income/${id}`), [navigate]);
  const toggle = useCallback((id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next.size === 0 ? null : next;
  }), []);
  const startSelect = useCallback((id: string) => setSelected(new Set([id])), []);
  const closeDate = useCallback(() => setDateSheet(false), []);

  if (!incomes || !expenses) return <div className={styles.screen} />;

  const fab = <Link className={ex.fab} to="/income/new" aria-label="Add income"><PlusIcon size={24} /></Link>;

  if (incomes.length === 0) {
    return (
      <div className={styles.screen}>
        <header className={ex.header}><h1 className={ex.title}>Income</h1></header>
        <div className={ex.empty}>
          <span className={ex.emptyIcon}><ArrowUpIcon size={28} /></span>
          <div className={ex.emptyTitle}>No income yet</div>
          <div className={ex.emptyText}>Add your salary, dividends or stock sales to see what you save each month and year.</div>
          <div className={ex.emptyActions}>
            <Link className={ex.pillPrimary} to="/income/new">Add income</Link>
            <Link className={ex.pillSecondary} to="/setup">Restore backup</Link>
          </div>
        </div>
      </div>
    );
  }

  const selectMode = selected !== null;
  const active = isIncomeFilterActive(filter);
  const currentMonth = monthKeyOf(today);

  const openMonth = (month: string) => {
    const { year, month: m } = parseMonthKey(month);
    setFilter({ ...EMPTY_INCOME_FILTER, range: { from: `${month}-01`, to: `${month}-${String(daysInMonth(year, m)).padStart(2, '0')}` } });
    setQueryInput('');
    setEntries(true);
  };

  const monthCard = (m: MonthSummary) => {
    const inProgress = m.month === currentMonth;
    return (
      <button key={m.month} type="button" className={styles.month} onClick={() => openMonth(m.month)}>
        <div className={styles.row}>
          <span className={styles.monthName}>{monthName(m.month)} {m.month.slice(0, 4)}</span>
          <Pct value={m.savingsPercent} inProgress={inProgress} />
        </div>
        <div className={styles.saved}>
          <span className={`${styles.savedMid} ${m.savingsCents < 0 ? styles.neg : styles.pos}`}>
            {m.savingsCents < 0 ? minus(m.savingsCents) : formatCents(m.savingsCents)}
          </span>
          <span className={styles.savedLabel} style={{ fontSize: 12 }}>saved</span>
        </div>
        <div className={styles.inout}>
          <span className={styles.word}>in</span> <span className={styles.in}>{formatCents(m.incomeCents)}</span>{' '}
          <span className={styles.dot}>·</span> <span className={styles.word}>out</span> {minus(m.expensesCents)}
        </div>
        {!inProgress && <Meter value={m.savingsPercent} />}
      </button>
    );
  };

  const sticky = stickyYear !== null ? years.find((y) => y.year === stickyYear) : undefined;

  // ---------- entries mode ----------
  const dateLabel = filter.preset
    ? DATE_PRESETS.find((p) => p.id === filter.preset)!.label
    : filter.range ? `${dmShort(filter.range.from)} – ${dmShort(filter.range.to)}` : null;
  const total = filtered.reduce((s, i) => s + i.amountCents, 0);
  const selectedTotal = selected ? incomes.reduce((s, i) => (selected.has(i.id) ? s + i.amountCents : s), 0) : 0;

  return (
    <div className={styles.screen}>
      {selectMode ? (
        <header className={`${ex.header} ${ex.headerSelect}`}>
          <button type="button" className={ex.iconButton} aria-label="Exit selection" onClick={() => setSelected(null)}><CloseIcon size={22} /></button>
          <h1 className={ex.titleSelect}>{selected?.size ?? 0} selected</h1>
          <button type="button" className={ex.textButton} onClick={() => setSelected(new Set(filtered.map((i) => i.id)))}>Select all</button>
        </header>
      ) : (
        <header className={ex.header}>
          <h1 className={ex.title}>Income</h1>
          <button type="button" className={ex.filterButton} aria-label="Search and filter entries" aria-pressed={entries} onClick={() => setEntries(!entries)}>
            <FilterIcon />
          </button>
        </header>
      )}

      {entries && !selectMode ? (
        <>
          <label className={ex.search}>
            <SearchIcon />
            <input className={ex.searchInput} type="search" placeholder="Search remarks" enterKeyHint="search"
              value={queryInput} onChange={(e) => setQueryInput(e.target.value)} />
            {queryInput && (
              <button type="button" className={ex.clearSearch} aria-label="Clear search" onClick={() => setQueryInput('')}><CloseIcon size={18} /></button>
            )}
          </label>
          <div className={styles.segments} role="group" aria-label="Kind">
            {[{ id: 'all' as const, label: 'All' }, ...INCOME_KINDS].map((k) => (
              <button key={k.id} type="button" className={styles.segment} aria-pressed={filter.kind === k.id}
                onClick={() => setFilter((f) => ({ ...f, kind: k.id }))}>{k.label}</button>
            ))}
          </div>
          <div className={ex.chips}>
            {dateLabel ? (
              <span className={ex.chipActive}>
                <button type="button" className={ex.chipActiveLabel} onClick={() => setDateSheet(true)}>{dateLabel}</button>
                <button type="button" className={ex.chipClear} aria-label="Clear date filter" onClick={() => setFilter((f) => ({ ...f, preset: null, range: null }))}>
                  <span><CloseIcon size={10} /></span>
                </button>
              </span>
            ) : (
              <button type="button" className={ex.chip} onClick={() => setDateSheet(true)}>Date<ChevronDown size={14} /></button>
            )}
          </div>
        </>
      ) : (
        <div className={ex.gap} />
      )}

      <div className={styles.listWrap}>
        {!entries && sticky && (
          <div className={styles.stickyYear} aria-hidden="true">
            <span className={styles.stickyTitle}>{sticky.year}{sticky.toDate ? ' · to date' : ''}</span>
            <span className={styles.stickyRight}>
              <span className={`${styles.stickyValue} ${sticky.savingsCents < 0 ? styles.neg : styles.pos}`}>
                {sticky.savingsCents < 0 ? minus(sticky.savingsCents) : formatCents(sticky.savingsCents)}
              </span>
              <Pct value={sticky.savingsPercent} />
            </span>
          </div>
        )}
        <div className={styles.list} ref={listRef} onScroll={onScroll}>
          {!entries ? (
            years.map((y, i) => (
              <div key={y.year}>
                {i > 0 && <div className={styles.yearGap} />}
                <section className={styles.year} ref={(el) => { if (el) yearCards.current.set(y.year, el); else yearCards.current.delete(y.year); }}>
                  <div className={styles.row}>
                    <h2 className={styles.yearTitle}>{y.year}{y.toDate ? ' · to date' : ''}</h2>
                    <Pct value={y.savingsPercent} />
                  </div>
                  <div className={styles.saved}>
                    <span className={`${styles.savedBig} ${y.savingsCents < 0 ? styles.neg : styles.pos}`}>
                      {y.savingsCents < 0 ? minus(y.savingsCents) : formatCents(y.savingsCents)}
                    </span>
                    <span className={styles.savedLabel}>saved</span>
                  </div>
                  <div className={styles.split}>
                    <div className={styles.splitCell}><div className={styles.splitLabel}>Income</div><div className={styles.splitValue}>{formatCents(y.incomeCents)}</div></div>
                    <div className={styles.splitCell}><div className={styles.splitLabel}>Expenses</div><div className={styles.splitValue}>{minus(y.expensesCents)}</div></div>
                  </div>
                  <Meter value={y.savingsPercent} />
                </section>
                {y.months.map(monthCard)}
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className={ex.empty}>
              <span className={ex.emptyIcon}><SearchIcon size={28} /></span>
              <div className={ex.emptyTitle}>{filter.query ? `No income matches “${filter.query}”` : 'No income matches these filters'}</div>
              <div className={ex.emptyActions}>
                <button type="button" className={ex.pillSecondary} onClick={() => { setFilter(EMPTY_INCOME_FILTER); setQueryInput(''); }}>Clear filters</button>
              </div>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.month} aria-label={monthHeader(g.month)}>
                <div className={ex.monthHeader}>
                  <span className={ex.monthName}>{monthHeader(g.month)}</span>
                  <span className={ex.monthTotal}>{formatCents(g.totalCents)}</span>
                </div>
                <div className={ex.group}>
                  {g.rows.map((i) => (
                    <IncomeRow key={i.id} income={i} selectMode={selectMode} selected={selected?.has(i.id) ?? false}
                      onOpen={open} onToggle={toggle} onStartSelect={startSelect} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <div className={ex.bottom}>
        {selectMode ? (
          <div className={`${ex.total} ${ex.totalSelected}`} role="status">
            <span className={ex.totalLabel}>{selected?.size ?? 0} selected</span>
            <span className={ex.totalValue}>{formatCents(selectedTotal)}</span>
          </div>
        ) : (
          <>
            {entries && active && (
              <div className={ex.total} role="status">
                <span className={ex.totalLabel}>{countLabel(filtered.length, filter.kind)}</span>
                <span className={ex.totalValue}>{formatCents(total)}</span>
              </div>
            )}
            {fab}
          </>
        )}
      </div>

      {dateSheet && <DateSheet filter={filter} today={today} countFor={countFor} nouns={['entry', 'entries']} onApply={(f) => { setFilter(f); setDateSheet(false); }} onClose={closeDate} />}
    </div>
  );
}
