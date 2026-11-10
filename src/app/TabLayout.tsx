import { NavLink, Outlet } from 'react-router-dom';
import { ArrowUpIcon, GearIcon, HomeIcon, ListIcon, PieIcon } from '../components/icons';
import styles from './TabLayout.module.css';

const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/expenses', label: 'Expenses', icon: ListIcon, end: true },
  { to: '/budgets', label: 'Budgets', icon: PieIcon, end: true },
  { to: '/income', label: 'Income', icon: ArrowUpIcon, end: true },
  { to: '/setup', label: 'Setup', icon: GearIcon, end: true },
] as const;

/** Height of the navigation bar without the safe area (6 + 64 + 14). */
export const NAV_HEIGHT = 84;

/** "Night ridges" background: gradient sky, a few stars, three mountain layers. */
function NightRidges() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.gradient} />
      <svg className={styles.ridges} viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice">
        {[[40, 60, 1, 0.5], [120, 30, 0.8, 0.4], [210, 90, 1.1, 0.55], [300, 40, 0.9, 0.45], [350, 120, 1, 0.4],
          [80, 150, 0.7, 0.35], [260, 170, 0.8, 0.35], [170, 210, 0.6, 0.3], [330, 230, 0.7, 0.3], [20, 250, 0.8, 0.3]]
          .map(([cx, cy, r, o]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#E6EAF2" fillOpacity={o} />)}
        <path d="M0 560 L60 500 L110 530 L170 450 L230 510 L290 470 L350 520 L390 490 L390 844 L0 844Z" fill="#3D9BFF" fillOpacity="0.07" />
        <path d="M0 640 L50 600 L120 650 L190 570 L250 620 L320 580 L390 630 L390 844 L0 844Z" fill="#8A8CF2" fillOpacity="0.08" />
        <path d="M0 720 L80 670 L150 710 L220 660 L300 715 L390 680 L390 844 L0 844Z" fill="#141925" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/** The five main screens share the background and the bottom navigation; forms do not. */
export function TabLayout() {
  return (
    <div className={styles.shell}>
      <NightRidges />
      <div className={styles.main}>
        <Outlet />
      </div>
      <nav className={styles.nav} aria-label="Main">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={styles.navItem}>
            <span className={styles.navIcon}><Icon /></span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
