export type AccountId = 'family' | 'personal' | 'sewing';

export type TransactionType = 'in' | 'out';

export type AppPage =
  | 'home'
  | 'treasury'
  | 'expenses'
  | 'bills'
  | 'goals'
  | 'tailoring'
  | 'reports'
  | 'tools';

export interface AccountInfo {
  id: AccountId;
  name: string;
  openingBalance: number;
}

export interface Transaction {
  id: number;
  box: 'home' | 'personal' | 'sewing';
  accountId: AccountId;
  cat: string;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  dateISO: string;
  ym: string;
  person?: string;
  shop?: string;
  source?: string;
  linkedCreditor?: string;
  homeDebtId?: number;
  homeDebtAllocations?: { debtId: number; amount: number }[];
  transferId?: number;
  transferFromAccountId?: AccountId;
  transferToAccountId?: AccountId;
  rentUnit?: string;
  photo?: string;
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
}

export interface SeasonalBudget {
  id: number;
  name: string;
  occasionType: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  targetDateIso: string;
  notes?: string;
  createdAt: number;
}

export interface DebtPayment {
  amount: number;
  ym: string;
  date: string;
  transactionId?: number;
}

export interface HomeDebt {
  id: number;
  creditor: string;
  item: string;
  activity: string;
  amount: number;
  paid: number;
  payments: DebtPayment[];
  due?: string;
  date: string;
  ym: string;
  direction?: 'out' | 'in';
  rentUnit?: string;
  photo?: string;
}

export interface RentDebt {
  id: number;
  direction: 'in' | 'out';
  unit: string;
  party: string;
  amount: number;
  paid: number;
  settled: boolean;
  treasuryApplied: boolean;
  transactionId: number | null;
  due?: string;
  date: string;
  ym: string;
}

export interface Obligation {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  paidMonths: string[];
  creditor?: string;
  photo?: string;
}

export interface AccountBookTx {
  id: number;
  delta: number;
  note: string;
  date: string;
  ym: string;
}

export interface AccountBookEntry {
  id: number;
  kind: 'customer' | 'supplier';
  name: string;
  phone?: string;
  note?: string;
  entries: AccountBookTx[];
}

export interface FacPlan {
  id: number;
  name: string;
  monthly: number;
  months: number;
  paidMonths: number;
  startYM: string;
}

export type OrderStage = 'جديد' | 'قيد التفصيل' | 'جاهز' | 'مسلّم';

export interface OrderFabricLine {
  id: string;
  name: string;
  source: 'customer' | 'workshop';
  meters: number;
  rate: number;
  buyRate: number;
  laborRate?: number | null;
  charge: number;
  cost: number;
}

export interface OrderSupplyLine {
  id: string;
  name: string;
  cost: number;
  stockId?: number;
  qty?: number;
  unit?: string;
}

export interface OrderMeasurements {
  len?: string;
  sh?: string;
  chest?: string;
  waist?: string;
  hip?: string;
  sleeve?: string;
  note?: string;
}

export interface SewingOrder {
  id: number;
  client: string;
  phone?: string;
  model: string;
  meters: number;
  meterRate?: number;
  flatLabor?: number;
  adjustment?: number;
  price: number;
  paid: number;
  fabricCost: number;
  threadCost: number;
  stage: OrderStage;
  fittingDate?: string;
  dueDate?: string;
  date: string;
  ym: string;
  notes?: string;
  photo?: string;
  fabrics?: OrderFabricLine[];
  supplies?: OrderSupplyLine[];
  measurements?: OrderMeasurements;
}

export interface MeasurementRecord {
  id: number;
  name: string;
  phone?: string;
  len: string;
  sh: string;
  chest: string;
  waist: string;
  hip: string;
  sleeve: string;
  note: string;
  date: string;
}

export interface SewMaterial {
  id: number;
  name: string;
  unit: string;
  qty: number;
  cost: number;
  min: number;
  date: string;
}

export interface SewServiceRecord {
  id: number;
  client: string;
  item: string;
  meters: number;
  rate: number;
  price: number;
  thread: number;
  supplies: number;
  paid: number;
  date: string;
  ym: string;
}

export interface SewProjectRecord {
  id: number;
  name: string;
  meters: number;
  fabricRate: number;
  fabric: number;
  supplies: number;
  other: number;
  sale: number;
  paid: number;
  status: 'work' | 'ready' | 'sold';
  date: string;
  ym: string;
}

export interface SewDebtRecord {
  id: number;
  type: 'in' | 'out';
  name: string;
  amount: number;
  paid: number;
  due?: string;
  date: string;
  ym: string;
}

export interface MarketItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  done: boolean;
}

export interface CatalogItem {
  id: number;
  name: string;
  group: string;
  price: number;
  unit: string;
  emoji: string;
}

export interface QuickExpensePreset {
  id: string;
  title: string;
  amount: number;
  emoji: string;
}

export interface WarrantyRecord {
  id: number;
  deviceName: string;
  category: string;
  shopOrBrand: string;
  purchaseDateIso: string;
  warrantyEndDateIso: string;
  cost: number;
  photoData: string;
  notes?: string;
  createdAt: number;
}

export interface MonthArchive {
  ym: string;
  targetMonth: string;
  salary1: number;
  salary2: number;
  carryIn: number;
  otherIncome: number;
  expenses: number;
  closingBalance: number;
  savedToGoal: number;
  carriedForward: number;
  closedAt: string;
}

export interface MonthClosePending {
  month: string;
  target: string;
}

export interface BudgetAllocationItem {
  id: string;
  label: string;
  amount: number;
  isDefault?: boolean;
}

export interface BudgetOrganizerState {
  totalBudgetOverride: number | null;
  items: BudgetAllocationItem[];
}

export interface SandooqiDB {
  s1: number;
  s2: number;
  pin: string;
  meterPrice: number;
  threadPrice: number;
  groceryBudget: number;
  marketBudget: number;
  sound: boolean;
  privacyMode: boolean;
  darkMode: boolean;
  monthSalaries: Record<string, { s1: number; s2: number }>;
  monthCarryovers: Record<string, number>;
  monthArchive: Record<string, MonthArchive>;
  monthClosePending: MonthClosePending[];
  lastActiveYM: string;
  accounts: Record<AccountId, AccountInfo>;
  goals: Goal[];
  seasonalBudgets: SeasonalBudget[];
  budgetOrganizer: BudgetOrganizerState;
  facPlans: FacPlan[];
  obligations: Obligation[];
  orders: SewingOrder[];
  measurements: MeasurementRecord[];
  sewMaterials: SewMaterial[];
  sewServices: SewServiceRecord[];
  sewProjects: SewProjectRecord[];
  debts: SewDebtRecord[];
  marketList: MarketItem[];
  family: string[];
  tx: Transaction[];
  homeDebts: HomeDebt[];
  rentDebts: RentDebt[];
  catalog: CatalogItem[];
  warranties: WarrantyRecord[];
  accountsBook: AccountBookEntry[];
  quickExpenses: QuickExpensePreset[];
  familyEntryOnlyMode: boolean;
  activeFamilyMember: string;
  appLockEnabled?: boolean;
}

export interface AccountSummary {
  opening: number;
  income: number;
  out: number;
  transferIn: number;
  transferOut: number;
  transfer: number;
  balance: number;
}

export interface CashReport {
  month: string;
  arr: Transaction[];
  salary: { s1: number; s2: number };
  home: AccountSummary & { expense: number };
  sewing: AccountSummary;
  personal: AccountSummary;
  combined: {
    opening: number;
    income: number;
    out: number;
    expense: number;
    net: number;
    balance: number;
  };
}
