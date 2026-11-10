import Dexie, { type EntityTable } from 'dexie';

/** All ids are strings: legacy numeric ids are imported unchanged, new ids are UUIDs. */
export interface ExpenseType {
  id: string;
  name: string;
  hidden: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  hidden: boolean;
  createdAt: string;
}

export interface HighlightColor {
  id: string;
  name: string;
  /** `#RRGGBB`, upper case */
  hex: string;
  sortOrder: number;
  hidden: boolean;
}

export interface Expense {
  id: string;
  /** YYYY-MM-DD calendar date, never a timestamp */
  date: string;
  /** integer cents; may be negative or zero */
  amountCents: number;
  expenseTypeId: string;
  groupId: string | null;
  colorId: string | null;
  note: string;
  seriesId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  date: string;
  amountCents: number;
  note: string;
  /** never both true */
  isDividend: boolean;
  isStockSale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export { SCHEMA_VERSION } from './version';

export class XpenceDB extends Dexie {
  expenseTypes!: EntityTable<ExpenseType, 'id'>;
  groups!: EntityTable<Group, 'id'>;
  colors!: EntityTable<HighlightColor, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  incomes!: EntityTable<Income, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name = 'xpence') {
    super(name);
    this.version(1).stores({
      expenseTypes: 'id, name',
      groups: 'id, name',
      colors: 'id',
      expenses: 'id, date, expenseTypeId, groupId, colorId, seriesId',
      incomes: 'id, date',
      meta: 'key',
    });
  }
}
