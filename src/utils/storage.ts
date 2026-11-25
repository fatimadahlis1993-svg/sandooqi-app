import { AccountId, SandooqiDB } from '../types/sandooqi';
import { createDefaultCatalog, currentYM, getTxYM } from './finance';

const IDB_NAME = 'sandooqi_app_db';
const IDB_VERSION = 1;
const IDB_STORE = 'state';
const IDB_KEY = 'main';
const LEGACY_LS_KEY = 'sandouqi_v4';

export function createDefaultDB(): SandooqiDB {
  return {
    s1: 120000,
    s2: 30000,
    pin: '1234',
    meterPrice: 300,
    threadPrice: 100,
    groceryBudget: 40000,
    marketBudget: 15000,
    sound: true,
    privacyMode: false,
    darkMode: false,
    monthSalaries: {},
    monthCarryovers: {},
    monthArchive: {},
    monthClosePending: [],
    lastActiveYM: currentYM(),
    accounts: {
      family: { id: 'family', name: 'الحساب العائلي', openingBalance: 0 },
      personal: { id: 'personal', name: 'الحساب الشخصي', openingBalance: 0 },
      sewing: { id: 'sewing', name: 'حساب الخياطة', openingBalance: 0 },
    },
    goals: [{ id: 1, name: 'حصّالة الطوارئ والعيد', target: 50000, saved: 0 }],
    seasonalBudgets: [],
    budgetOrganizer: {
      totalBudgetOverride: null,
      items: [
        { id: 'rent', label: 'الكراء', amount: 0, isDefault: true },
        { id: 'living', label: 'المصروف', amount: 0, isDefault: true },
      ],
    },
    facPlans: [],
    obligations: [],
    orders: [],
    marketList: [],
    family: ['إسلام', 'محمد', 'يوسف', 'نعيمة'],
    tx: [],
    homeDebts: [],
    rentDebts: [],
    catalog: createDefaultCatalog(),
    warranties: [],
    quickExpenses: [
      { id: 'q1', title: 'خبز', amount: 40, emoji: '🥖' },
      { id: 'q2', title: 'حليب', amount: 120, emoji: '🥛' },
      { id: 'q3', title: 'قهوة', amount: 100, emoji: '☕' },
      { id: 'q4', title: 'نقل', amount: 200, emoji: '🚕' },
    ],
    familyEntryOnlyMode: false,
    activeFamilyMember: 'إسلام',
  };
}

export function normalizeSandooqiDB(raw: Partial<SandooqiDB> | null | undefined): SandooqiDB {
  const def = createDefaultDB();
  if (!raw || typeof raw !== 'object') return def;

  const merged: SandooqiDB = {
    ...def,
    ...raw,
    s1: Math.max(0, Number(raw.s1 ?? def.s1) || 0),
    s2: Math.max(0, Number(raw.s2 ?? def.s2) || 0),
    meterPrice: Math.max(0, Number(raw.meterPrice ?? def.meterPrice) || 0),
    threadPrice: Math.max(0, Number(raw.threadPrice ?? def.threadPrice) || 0),
    groceryBudget: Math.max(0, Number(raw.groceryBudget ?? def.groceryBudget) || 0),
    marketBudget: Math.max(0, Number(raw.marketBudget ?? def.marketBudget) || 0),
    family:
      Array.isArray(raw.family) && raw.family.filter(Boolean).length > 0
        ? raw.family.filter(Boolean)
        : def.family,
    goals: Array.isArray(raw.goals) ? raw.goals.filter(Boolean) : def.goals,
    seasonalBudgets: Array.isArray(raw.seasonalBudgets) ? raw.seasonalBudgets.filter(Boolean) : [],
    budgetOrganizer:
      raw.budgetOrganizer && typeof raw.budgetOrganizer === 'object'
        ? {
            totalBudgetOverride:
              raw.budgetOrganizer.totalBudgetOverride === null ||
              raw.budgetOrganizer.totalBudgetOverride === undefined
                ? null
                : Math.max(0, Number(raw.budgetOrganizer.totalBudgetOverride) || 0),
            items:
              Array.isArray(raw.budgetOrganizer.items) && raw.budgetOrganizer.items.length > 0
                ? raw.budgetOrganizer.items
                    .filter((item) => item && typeof item.label === 'string')
                    .map((item, idx) => ({
                      id: String(item.id || `b_${idx}`),
                      label: item.label.trim() || 'بند',
                      amount: Math.max(0, Number(item.amount) || 0),
                      isDefault: Boolean(item.isDefault),
                    }))
                : def.budgetOrganizer.items,
          }
        : def.budgetOrganizer,
    facPlans: Array.isArray(raw.facPlans) ? raw.facPlans.filter(Boolean) : [],
    obligations: Array.isArray(raw.obligations) ? raw.obligations.filter(Boolean) : [],
    orders: Array.isArray(raw.orders) ? raw.orders.filter(Boolean) : [],
    marketList: Array.isArray(raw.marketList)
      ? raw.marketList.filter(Boolean).map((m) => ({
          id: Number(m.id) || Date.now(),
          name: m.name || (m as unknown as { text?: string }).text || 'غرض',
          quantity: Number(m.quantity) || 1,
          unit: m.unit || 'حبة',
          price: Number(m.price) || 0,
          done: Boolean(m.done),
        }))
      : [],
    tx: Array.isArray(raw.tx)
      ? raw.tx.filter(Boolean).map((t) => {
          const acc: AccountId =
            t.accountId === 'personal' || t.accountId === 'sewing' || t.accountId === 'family'
              ? t.accountId
              : t.box === 'personal'
                ? 'personal'
                : t.box === 'sewing'
                  ? 'sewing'
                  : 'family';
          return {
            ...t,
            accountId: acc,
            box: acc === 'family' ? 'home' : acc,
            ym: getTxYM(t),
            amount: Number(t.amount) || 0,
          };
        })
      : [],
    homeDebts: Array.isArray(raw.homeDebts) ? raw.homeDebts.filter(Boolean) : [],
    rentDebts: Array.isArray(raw.rentDebts) ? raw.rentDebts.filter(Boolean) : [],
    catalog:
      Array.isArray(raw.catalog) && raw.catalog.length > 0
        ? raw.catalog.filter(Boolean).map((c) => ({
            id: Number(c.id) || Date.now(),
            name: c.name || 'منتج',
            group: c.group || 'أخرى',
            price: Number(c.price) || 0,
            unit: c.unit || 'حبة',
            emoji: c.emoji || '🛍️',
          }))
        : def.catalog,
    warranties: Array.isArray(raw.warranties) ? raw.warranties.filter(Boolean) : [],
    quickExpenses:
      Array.isArray(raw.quickExpenses) && raw.quickExpenses.length > 0
        ? raw.quickExpenses.filter(Boolean)
        : def.quickExpenses,
    monthSalaries:
      raw.monthSalaries && typeof raw.monthSalaries === 'object' ? raw.monthSalaries : {},
    monthCarryovers:
      raw.monthCarryovers && typeof raw.monthCarryovers === 'object' ? raw.monthCarryovers : {},
    monthArchive:
      raw.monthArchive && typeof raw.monthArchive === 'object' ? raw.monthArchive : {},
    monthClosePending: Array.isArray(raw.monthClosePending) ? raw.monthClosePending : [],
  };

  merged.accounts = {
    family: {
      id: 'family',
      name: raw.accounts?.family?.name || 'الحساب العائلي',
      openingBalance: Number(raw.accounts?.family?.openingBalance) || 0,
    },
    personal: {
      id: 'personal',
      name: raw.accounts?.personal?.name || 'الحساب الشخصي',
      openingBalance: Number(raw.accounts?.personal?.openingBalance) || 0,
    },
    sewing: {
      id: 'sewing',
      name: raw.accounts?.sewing?.name || 'حساب الخياطة',
      openingBalance: Number(raw.accounts?.sewing?.openingBalance) || 0,
    },
  };

  if (!merged.activeFamilyMember || !merged.family.includes(merged.activeFamilyMember)) {
    merged.activeFamilyMember = merged.family[0] || 'إسلام';
  }

  // Track month advance automatically
  const cur = currentYM();
  const prev = merged.lastActiveYM;
  if (
    prev &&
    /^\d{4}-\d{2}$/.test(prev) &&
    prev < cur &&
    !merged.monthArchive[prev] &&
    !Object.hasOwn(merged.monthCarryovers, cur) &&
    !merged.monthClosePending.some((p) => p.month === prev || p.target === cur)
  ) {
    if (!merged.monthSalaries[prev]) {
      merged.monthSalaries[prev] = { s1: merged.s1, s2: merged.s2 };
    }
    merged.monthClosePending.push({ month: prev, target: cur });
  }
  merged.lastActiveYM = cur;

  return merged;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(IDB_STORE)) {
        database.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSandooqiDB(): Promise<{
  db: SandooqiDB;
  migratedFromLegacy: boolean;
}> {
  try {
    const idb = await openDB();
    const stored = await new Promise<SandooqiDB | null>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY);
      getReq.onsuccess = () => resolve((getReq.result as SandooqiDB) || null);
      getReq.onerror = () => reject(getReq.error);
    });
    idb.close();

    if (stored) {
      return { db: normalizeSandooqiDB(stored), migratedFromLegacy: false };
    }

    // Attempt one-time migration from legacy localStorage key sandouqi_v4
    const legacyRaw = localStorage.getItem(LEGACY_LS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Partial<SandooqiDB>;
      const normalized = normalizeSandooqiDB(parsed);
      await saveSandooqiDB(normalized);
      return { db: normalized, migratedFromLegacy: true };
    }
  } catch {
    // Fallback cleanly if IndexedDB is blocked
    try {
      const legacyRaw = localStorage.getItem(LEGACY_LS_KEY);
      if (legacyRaw) {
        return {
          db: normalizeSandooqiDB(JSON.parse(legacyRaw) as Partial<SandooqiDB>),
          migratedFromLegacy: false,
        };
      }
    } catch {
      // Ignore fallback parse failure
    }
  }

  return { db: createDefaultDB(), migratedFromLegacy: false };
}

export async function saveSandooqiDB(db: SandooqiDB): Promise<void> {
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(db, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    idb.close();
  } catch {
    // Fallback to localStorage only if IndexedDB fails (e.g. restricted private mode)
    try {
      localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(db));
    } catch {
      throw new Error('تعذر حفظ البيانات في المتصفح.');
    }
  }
}

export async function estimateStorageUsage(): Promise<{
  usedBytes: number;
  quotaBytes: number | null;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usedBytes: est.usage || 0,
        quotaBytes: est.quota || null,
      };
    } catch {
      // Ignore estimate failures
    }
  }
  return { usedBytes: 0, quotaBytes: null };
}

// Legacy FNV-1a check + modern SHA-256 hashing via Web Crypto
function legacyHashPin(pin: string): string {
  const s = 'sandouqi_salt_v10:' + String(pin || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'h$' + (h >>> 0).toString(16);
}

export async function hashPinSha256(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(`sandooqi_sha256_v1:${pin}`);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `s256$${hex}`;
  }
  return legacyHashPin(pin);
}

export async function verifyPin(input: string, stored: string): Promise<boolean> {
  const raw = String(stored || '1234');
  if (raw.startsWith('s256$')) {
    return (await hashPinSha256(input)) === raw;
  }
  if (raw.startsWith('h$')) {
    return legacyHashPin(input) === raw;
  }
  return input === raw;
}

export async function compressImageFile(file: File, maxDim = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
