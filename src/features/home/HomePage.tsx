import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowDownIcon, ArrowUpIcon, CheckIcon, ChevronRight, ClockIcon, CloudCheckIcon, InfoIcon, PlusIcon, RestoreIcon, WarnIcon,
} from '../../components/icons';
import { useSnackbar, useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { db } from '../../db/db';
import { useSettings, type Settings } from '../../db/hooks';
import { addMonthsToKey, formatChipDate, monthKeyOf, todayIso } from '../../domain/dates';
import { monthName } from '../../domain/expenseFilter';
import { toneFor } from '../../domain/budgets';
import { formatEuroShort, rangeBar } from '../../domain/homeBar';
import { backupStatus, daysAgo } from '../../domain/setup';
import { formatCents } from '../../domain/money';
import {
  assessMonth, computePace, firstMonthOf, windowFor, type Dated, type Pace,
} from '../../domain/usual';
import styles from './Home.module.css';

const stateColor = { onTrack: 'var(--accent)', trendingOver: 'var(--warn)', over: 'var(--danger)' } as const;

export function HomePage() {
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const settings = useSettings();
  const { visible: snackbarVisible } = useSnackbar();
  // between the lifted Add button and the navigation bar
  useSnackbarPlacement(NAV_HEIGHT + 12);

  if (expenses === undefined || settings === undefined) return <div className={styles.screen} />;

  const today = todayIso();
  const fab = (
    <div className={`${styles.fabRow} ${snackbarVisible ? styles.fabRowLifted : ''}`}>
      <Link className={`${styles.fab} ${expenses.length === 0 ? styles.fabWide : ''}`} to="/expenses/new">
        <PlusIcon />{expenses.length === 0 ? 'Add first expense' : 'Add expense'}
      </Link>
    </div>
  );

  if (expenses.length === 0) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}><span className={styles.date}>{formatChipDate(today)}</span></header>
        <section className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>Welcome to Xpence</h1>
          <p className={styles.welcomeText}>No expenses yet. Add your first one, or restore a backup from your old app or another phone.</p>
        </section>
        <div className={`${styles.card} ${styles.restoreCard}`}>
          <span className={styles.restoreIcon}><RestoreIcon /></span>
          <div>
            <div className={styles.restoreTitle}>Have a backup?</div>
            <div className={styles.restoreText}>Restore it in Setup</div>
          </div>
          <Link className={styles.restoreButton} to="/setup">Restore</Link>
        </div>
        <div className={styles.spacer} />
        {fab}
      </div>
    );
  }

  const size = settings.usualWindowMonths;
  const month = monthKeyOf(today);
  const pace = computePace(expenses, today, size);
  const over = pace.state === 'over';

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.date}>{formatChipDate(today)}</span>
        <BackupStatus settings={settings} />
      </header>

      <Link className={styles.hero} to="/expenses?range=this-month" aria-label={`Spent in ${monthName(month)} so far, ${formatCents(pace.spentToDate)}. Open ${monthName(month)} expenses`}>
        <div className={styles.heroLabel}>Spent in {monthName(month)} so far<ChevronRight /></div>
        <div className={`${styles.heroAmount} ${over ? styles.heroOver : ''}`}>{formatCents(pace.spentToDate)}</div>
        {pace.scheduled !== 0 && (
          <div className={styles.scheduled}>
            <ClockIcon size={15} strokeWidth={2} />
            <span className={styles.num}>{pace.scheduled > 0 ? '+' : ''}{formatCents(pace.scheduled)}</span> scheduled this month
          </div>
        )}
      </Link>

      {pace.usual ? <PaceCard pace={pace} size={size} month={month} /> : <NoHistoryCard expenses={expenses} month={month} size={size} />}
      <LastMonthCard expenses={expenses} month={addMonthsToKey(month, -1)} size={size} />

      <div className={styles.spacer} />
      {fab}
    </div>
  );
}

function BackupStatus({ settings }: { settings: Settings }) {
  // same rule as Setup, so both screens always agree
  const { state, days } = backupStatus(settings.lastBackupAt, settings.backupReminderDays);
  if (state === 'never') {
    return <Link className={`${styles.backup} ${styles.backupDanger}`} to="/setup"><WarnIcon />Never backed up</Link>;
  }
  const text = days === 0 ? 'Backed up today' : `Backup ${daysAgo(days)}`;
  if (state === 'overdue') {
    return <Link className={`${styles.backup} ${styles.backupWarn}`} to="/setup"><WarnIcon />{text}</Link>;
  }
  return <Link className={styles.backup} to="/setup"><CloudCheckIcon />{text}</Link>;
}

function PaceCard({ pace, size, month }: { pace: Pace; size: number; month: string }) {
  const usual = pace.usual!;
  const bar = rangeBar(pace)!;
  const state = pace.state ?? 'onTrack';
  const color = stateColor[state];

  let badge;
  let note: string | null = null;
  if (state === 'over') {
    badge = <span className={`${styles.badge} ${styles.badgeOver}`}><WarnIcon size={15} />Over usual range</span>;
    note = `Already ${formatCents(pace.spentToDate - usual.upper)} above the usual upper bound.`;
  } else if (state === 'trendingOver') {
    badge = <span className={`${styles.badge} ${styles.badgeWarn}`}><ArrowUpIcon size={15} strokeWidth={2.4} />Trending over</span>;
    note = `Heading ${formatCents(pace.projected! - usual.upper)} above the usual upper bound.`;
  } else {
    badge = (
      <span className={`${styles.badge} ${styles.badgeOk}`}>
        <CheckIcon size={15} strokeWidth={2.4} />On track{pace.betterThanUsual ? ' · better than usual' : ''}
      </span>
    );
  }

  return (
    <section className={`${styles.card} ${styles.cardFirst}`} aria-label={`Where ${monthName(month)} is heading`}>
      <div>{badge}</div>
      <div className={styles.projRow}>
        <span className={styles.label}>Projected month end</span>
        <span className={styles.projValue} style={state === 'onTrack' ? undefined : { color }}>{formatCents(pace.projected!)}</span>
      </div>
      <div
        className={styles.bar}
        style={{ '--c': color } as CSSProperties}
        role="img"
        aria-label={`Spent ${formatCents(pace.spentToDate)}, projected ${formatCents(pace.projected!)}, usual range ${formatCents(usual.lower)} to ${formatCents(usual.upper)}`}
      >
        <div className={styles.track} />
        <div className={`${styles.band} ${state === 'onTrack' ? '' : styles.bandMuted}`} style={{ left: `${bar.lower}%`, width: `${bar.upper - bar.lower}%` }} />
        <div className={styles.medianTick} style={{ left: `${bar.median}%` }} />
        <div className={styles.spentLine} style={{ width: `${bar.spent}%` }} />
        {bar.projected > bar.spent && <div className={styles.projLine} style={{ left: `${bar.spent}%`, width: `${bar.projected - bar.spent}%` }} />}
        <div className={styles.spentDot} style={{ left: `${bar.spent}%` }} />
        {bar.overflow
          ? <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          : <div className={styles.projDot} style={{ left: `${bar.projected}%` }} />}
      </div>
      <div className={styles.ticks} aria-hidden="true">
        <span style={{ left: `${bar.lower}%` }}>{formatEuroShort(usual.lower)}</span>
        {!bar.hideMedianLabel && <span className={styles.tickMedian} style={{ left: `${bar.median}%` }}>{formatEuroShort(usual.median)}</span>}
        <span style={{ left: `${bar.upper}%` }}>{formatEuroShort(usual.upper)}</span>
      </div>
      <div className={styles.legend} style={{ '--c': color } as CSSProperties}>
        <span><span className={styles.keySpent} />Spent</span>
        <span><span className={styles.keyProj} />Projected</span>
        <span><span className={styles.keyBand} />Usual · {size} mo</span>
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}

function NoHistoryCard({ expenses, month, size }: { expenses: readonly Dated[]; month: string; size: number }) {
  const complete = windowFor(month, size, firstMonthOf(expenses)).length;
  return (
    <section className={`${styles.card} ${styles.cardFirst}`} aria-label="Usual range">
      <span className={`${styles.badge} ${styles.badgeMuted}`}><InfoIcon />Not enough history</span>
      <p className={styles.history}>
        Your usual range and the month-end projection appear after {size} complete months. <b>{complete} of {size}</b> so far.
      </p>
      <div className={styles.progress} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }} aria-hidden="true">
        {Array.from({ length: size }, (_, i) => <span key={i} className={i < complete ? styles.done : ''} />)}
      </div>
    </section>
  );
}

function LastMonthCard({ expenses, month, size }: { expenses: readonly Dated[]; month: string; size: number }) {
  const { total, usual, aboveUsual } = assessMonth(expenses, month, size);
  // same rule as the Budgets screen: green only when the month was clearly below usual
  const below = toneFor(total, usual, 'past') === 'below';
  let badge = null;
  if (aboveUsual) badge = <span className={`${styles.badge} ${styles.badgeOver}`}><ArrowUpIcon size={14} strokeWidth={2.4} />Above usual</span>;
  else if (below) badge = <span className={`${styles.badge} ${styles.badgeBelow}`}><ArrowDownIcon />Below usual</span>;
  else if (usual) badge = <span className={`${styles.badge} ${styles.badgeWithin}`}>Within usual</span>;

  return (
    <section className={`${styles.card} ${aboveUsual ? styles.cardAlert : ''}`} aria-label="Last month">
      <div className={styles.lastRow}>
        <div>
          <div className={styles.label}>Last month · {monthName(month)}</div>
          <div className={`${styles.lastAmount} ${aboveUsual ? styles.lastAmountOver : ''}`}>{formatCents(total)}</div>
        </div>
        {badge}
      </div>
      {aboveUsual && usual && (
        <p className={styles.note}>{formatCents(total - usual.upper)} over the usual upper bound. Time to save a bit harder.</p>
      )}
    </section>
  );
}
