import {
  AccountId,
  AccountSummary,
  CashReport,
  CatalogItem,
  HomeDebt,
  SandooqiDB,
  Transaction,
} from '../types/sandooqi';

export const AR_MONTHS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function nextId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('ar-DZ');
}

export function currentYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftYM(ym: string, deltaMonths: number): string {
  const [yStr, mStr] = ym.split('-');
  const y = Number(yStr) || new Date().getFullYear();
  const m = (Number(mStr) || 1) - 1;
  const total = y * 12 + m + deltaMonths;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}

export function formatYM(ym: string): string {
  if (ym === 'all') return 'كل الأشهر';
  const [y, m] = String(ym).split('-');
  const idx = parseInt(m, 10) - 1;
  return `${AR_MONTHS[idx] || m} ${y}`;
}

export function fmt(n: number): string {
  return `${Math.round(Number(n || 0)).toLocaleString('fr-FR')} دج`;
}

export function normArDigits(str: string): string {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '٫': '.',
  };
  return String(str || '').replace(/[٠-٩٫]/g, (ch) => map[ch] || ch);
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const p = String(iso).trim().split('-');
  if (p.length !== 3) return null;
  const target = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - todayMid.getTime()) / 86400000);
}

export function getTxYM(t: Partial<Transaction>): string {
  if (t.ym && /^\d{4}-\d{2}$/.test(t.ym)) return t.ym;
  if (t.dateISO && /^\d{4}-\d{2}/.test(t.dateISO)) return t.dateISO.slice(0, 7);
  return currentYM();
}

export function salaryForMonth(db: SandooqiDB, ym: string): { s1: number; s2: number } {
  const saved = db.monthSalaries?.[ym];
  if (saved) {
    return {
      s1: Math.max(0, Number(saved.s1) || 0),
      s2: Math.max(0, Number(saved.s2) || 0),
    };
  }
  if (ym === currentYM()) {
    return {
      s1: Math.max(0, Number(db.s1) || 0),
      s2: Math.max(0, Number(db.s2) || 0),
    };
  }
  return { s1: 0, s2: 0 };
}

export function carryoverForMonth(db: SandooqiDB, ym: string): number {
  return Math.max(0, Number(db.monthCarryovers?.[ym]) || 0);
}

export function transactionAccount(tx: Transaction): AccountId {
  if (tx.accountId === 'personal' || tx.accountId === 'family' || tx.accountId === 'sewing') {
    return tx.accountId;
  }
  if (tx.box === 'personal') return 'personal';
  if (tx.box === 'sewing') return 'sewing';
  return 'family';
}

function internalTransferDirection(tx: Transaction): 'in' | 'out' | null {
  if (tx.cat === 'transfer' || tx.cat === 'account_transfer') {
    return tx.type;
  }
  return null;
}

function isCreditPurchase(tx: Transaction): boolean {
  return tx.source === 'credit-purchase' || tx.cat === 'credit_purchase';
}

export function computeCashReportForMonth(db: SandooqiDB, month: string): CashReport {
  const rows = db.tx.filter((tx) => getTxYM(tx) === month);
  const salary = salaryForMonth(db, month);

  const opening = {
    home: carryoverForMonth(db, month),
    personal: Number(db.accounts?.personal?.openingBalance) || 0,
    sewing: Number(db.accounts?.sewing?.openingBalance) || 0,
  };

  for (const tx of db.tx) {
    const acc = transactionAccount(tx);
    if (acc === 'family' || getTxYM(tx) >= month || isCreditPurchase(tx)) continue;
    const dir = internalTransferDirection(tx) || tx.type;
    if (dir === 'in') opening[acc] += Number(tx.amount) || 0;
    if (dir === 'out') opening[acc] -= Number(tx.amount) || 0;
  }

  const boxes = {
    home: { income: salary.s1 + salary.s2, out: 0, incoming: 0, outgoing: 0 },
    sewing: { income: 0, out: 0, incoming: 0, outgoing: 0 },
    personal: { income: 0, out: 0, incoming: 0, outgoing: 0 },
  };

  for (const tx of rows) {
    const amt = Number(tx.amount) || 0;
    const acc = transactionAccount(tx);
    const key = acc === 'family' ? 'home' : acc;
    const dir = internalTransferDirection(tx);
    if (dir) {
      if (dir === 'in') boxes[key].incoming += amt;
      else boxes[key].outgoing += amt;
      continue;
    }
    if (isCreditPurchase(tx)) continue;
    if (tx.type === 'in') boxes[key].income += amt;
    if (tx.type === 'out') boxes[key].out += amt;
  }

  const summarize = (
    box: { income: number; out: number; incoming: number; outgoing: number },
    openVal: number
  ): AccountSummary => ({
    opening: openVal,
    income: box.income,
    out: box.out,
    transferIn: box.incoming,
    transferOut: box.outgoing,
    transfer: box.incoming - box.outgoing,
    balance: openVal + box.income + box.incoming - box.outgoing - box.out,
  });

  const homeSummary = summarize(boxes.home, opening.home);
  const sewingSummary = summarize(boxes.sewing, opening.sewing);
  const personalSummary = summarize(boxes.personal, opening.personal);

  const totalIncome = boxes.home.income + boxes.sewing.income + boxes.personal.income;
  const totalOut = boxes.home.out + boxes.sewing.out + boxes.personal.out;
  const combinedOpening = opening.home + opening.sewing + opening.personal;

  return {
    month,
    arr: rows,
    salary,
    home: { ...homeSummary, expense: boxes.home.out },
    sewing: sewingSummary,
    personal: personalSummary,
    combined: {
      opening: combinedOpening,
      income: totalIncome,
      out: totalOut,
      expense: totalOut,
      net: totalIncome - totalOut,
      balance: homeSummary.balance + sewingSummary.balance + personalSummary.balance,
    },
  };
}

export function debtRemaining(debt: HomeDebt): number {
  return Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paid) || 0));
}

export function makeTransaction(
  partial: Partial<Transaction> & {
    accountId?: AccountId;
    box?: 'home' | 'personal' | 'sewing';
    type: 'in' | 'out';
    name: string;
    amount: number;
    cat: string;
  }
): Transaction {
  const accountId: AccountId =
    partial.accountId ||
    (partial.box === 'personal' ? 'personal' : partial.box === 'sewing' ? 'sewing' : 'family');
  const box = accountId === 'family' ? 'home' : accountId;
  return {
    id: nextId(),
    box,
    accountId,
    cat: partial.cat,
    type: partial.type,
    name: partial.name,
    amount: Math.max(0, Number(partial.amount) || 0),
    date: partial.date || todayLabel(),
    dateISO: partial.dateISO || localDateISO(),
    ym: partial.ym || currentYM(),
    person: partial.person,
    shop: partial.shop,
    source: partial.source,
    linkedCreditor: partial.linkedCreditor,
    homeDebtId: partial.homeDebtId,
    homeDebtAllocations: partial.homeDebtAllocations,
    transferId: partial.transferId,
    transferFromAccountId: partial.transferFromAccountId,
    transferToAccountId: partial.transferToAccountId,
    rentUnit: partial.rentUnit,
    photo: partial.photo,
  };
}

export function parseArabicVoiceEntry(raw: string): {
  title: string;
  amount: string;
  mode: 'cash' | 'in' | 'out';
  party: string;
} {
  const text = normArDigits(raw).trim().replace(/\s+/g, ' ');
  if (!text) return { title: '', amount: '', mode: 'cash', party: '' };

  const nums: { val: string; idx: number; raw: string }[] = [];
  const rx = /(\d+(?:[.,]\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const before = text.slice(0, m.index);
    if (!/(?:رقم|محل)\s*$/.test(before)) {
      nums.push({ val: m[1].replace(',', '.'), idx: m.index, raw: m[0] });
    }
  }
  const chosen = nums.length ? nums[nums.length - 1] : null;
  const hasLah = /(?:^|\s)(?:له|لي عند|مستحق لي)(?=$|\s)/.test(text);
  const hasAlayh = /(?:^|\s)(?:عليه|علي|دين|كريدي|بالدين|آجل)(?=$|\s)/.test(text);
  const mode: 'cash' | 'in' | 'out' = hasLah && !hasAlayh ? 'in' : hasAlayh ? 'out' : 'cash';

  const partyM = text.match(/(?:^|\s)(?:من عند|عند|من|لـ)\s+([^\s]+(?:\s+[^\s]+)?)/);
  const stop = new Set(['دين', 'كريدي', 'بالدين', 'دج', 'دينار', 'له', 'عليه']);
  const party = partyM
    ? partyM[1]
        .split(' ')
        .filter((w) => !stop.has(w))
        .slice(0, 2)
        .join(' ')
    : '';

  let clean = chosen
    ? text.slice(0, chosen.idx) + ' ' + text.slice(chosen.idx + chosen.raw.length)
    : text;
  if (partyM) clean = clean.replace(partyM[0], ' ');
  clean = clean
    .replace(/(?:^|\s)(?:دج|دينار|دين|كريدي|بالدين|آجل|نقدا|نقداً|له|عليه)(?=$|\s)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: clean, amount: chosen ? chosen.val : '', mode, party };
}

export function createDefaultCatalog(): CatalogItem[] {
  const groups: { group: string; unit: string; items: [string, string][] }[] = [
    {
      group: 'خضر',
      unit: 'كغ',
      items: [
        ['بطاطا', '🥔'],
        ['طماطم', '🍅'],
        ['بصل', '🧅'],
        ['ثوم', '🧄'],
        ['جزر', '🥕'],
        ['قرعة (كوسة)', '🥒'],
        ['فلفل حلو', '🫑'],
        ['فلفل حار', '🌶️'],
        ['باذنجان', '🍆'],
        ['خيار', '🥒'],
        ['خس (سلاطة)', '🥬'],
        ['شفلور / بروكلي', '🥦'],
        ['جلبانة', '🫛'],
        ['معدنوس وقزبر', '🌿'],
      ],
    },
    {
      group: 'فواكه',
      unit: 'كغ',
      items: [
        ['تفاح', '🍎'],
        ['موز', '🍌'],
        ['برتقال', '🍊'],
        ['فراولة', '🍓'],
        ['ليمون (قارص)', '🍋'],
        ['تمر', '🌴'],
        ['عنب', '🍇'],
        ['دلاع (بطيخ)', '🍉'],
      ],
    },
    {
      group: 'لحوم وأسماك',
      unit: 'كغ',
      items: [
        ['دجاج كامل', '🍗'],
        ['صدر دجاج', '🍗'],
        ['لحم بقري', '🥩'],
        ['لحم غنمي', '🍖'],
        ['مرقاز', '🌭'],
        ['سردين', '🐟'],
        ['سمك أبيض', '🐟'],
      ],
    },
    {
      group: 'مواد غذائية',
      unit: 'حبة',
      items: [
        ['سميد', '🌾'],
        ['فرينة', '🥖'],
        ['زيت المائدة', '🌻'],
        ['زيت زيتون', '🫒'],
        ['سكر', '🍬'],
        ['قهوة', '☕'],
        ['حليب', '🥛'],
        ['بيض', '🥚'],
        ['جبن (فرماج)', '🧀'],
        ['زبدة', '🧈'],
        ['خبز', '🥖'],
        ['كسكس', '🍲'],
        ['أرز', '🍚'],
        ['عدس', '🫘'],
        ['حمص', '🫘'],
        ['طماطم مصبرة', '🥫'],
      ],
    },
  ];

  let id = 1700000000000;
  const result: CatalogItem[] = [];
  for (const g of groups) {
    for (const [name, emoji] of g.items) {
      result.push({
        id: id++,
        name,
        group: g.group,
        price: 0,
        unit: g.unit,
        emoji,
      });
    }
  }
  return result;
}
