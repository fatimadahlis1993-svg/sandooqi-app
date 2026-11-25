import React, { useState } from 'react';
import { Mic, X } from 'lucide-react';
import { parseArabicVoiceEntry } from '../utils/finance';

interface VoiceEntryModalProps {
  open: boolean;
  familyEntryOnlyMode: boolean;
  creditorNames: string[];
  onClose: () => void;
  onSave: (payload: {
    mode: 'cash' | 'in' | 'out';
    title: string;
    amount: number;
    party: string;
    applyNow: boolean;
  }) => void;
}

export const VoiceEntryModal: React.FC<VoiceEntryModalProps> = ({
  open,
  familyEntryOnlyMode,
  creditorNames,
  onClose,
  onSave,
}) => {
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'cash' | 'in' | 'out'>('cash');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [party, setParty] = useState('');
  const [applyNow, setApplyNow] = useState(false);
  const [micStatus, setMicStatus] = useState('');

  if (!open) return null;

  const applyPhrase = (val: string) => {
    setRawText(val);
    const parsed = parseArabicVoiceEntry(val);
    setTitle(parsed.title);
    setAmount(parsed.amount);
    if (parsed.party) setParty(parsed.party);
    const nextMode = familyEntryOnlyMode ? 'cash' : parsed.mode;
    setMode(nextMode);
    setApplyNow(nextMode === 'in');
  };

  const handleMic = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void;
        onerror: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void;
        onerror: () => void;
        start: () => void;
      };
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      setMicStatus('المتصفح لا يدعم الميكروفون مباشرة؛ يمكنك الإملاء عبر لوحة المفاتيح أو الكتابة أدناه.');
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'ar-DZ';
      rec.interimResults = false;
      setMicStatus('استمع الآن... تكلّم بالعربية');
      rec.onresult = (ev) => {
        const txt = ev.results?.[0]?.[0]?.transcript || '';
        applyPhrase(txt);
        setMicStatus(`تم الالتقاط: ${txt}`);
      };
      rec.onerror = () => {
        setMicStatus('تعذّر التقاط الصوت؛ اكتب الجملة أو استعمل إملاء لوحة المفاتيح.');
      };
      rec.start();
    } catch {
      setMicStatus('تعذّر تشغيل الميكروفون؛ اكتب الجملة مباشرة.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMicStatus('أدخل مبلغاً صحيحاً أولاً.');
      return;
    }
    onSave({
      mode: familyEntryOnlyMode ? 'cash' : mode,
      title: title.trim() || 'مصروف بالصوت',
      amount: amt,
      party: party.trim(),
      applyNow,
    });
    setRawText('');
    setTitle('');
    setAmount('');
    setParty('');
    setMicStatus('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            التسجيل السريع بالصوت أو الجملة
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={rawText}
              onChange={(e) => applyPhrase(e.target.value)}
              placeholder="مثال: خبز وحليب 180 أو دين عند عمر 2500"
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleMic}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Mic className="h-4 w-4" />
              <span>تكلّم</span>
            </button>
          </div>

          {micStatus && (
            <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {micStatus}
            </p>
          )}

          {!familyEntryOnlyMode && (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['cash', 'مصروف نقدي'],
                  ['in', 'مستحق لي (له)'],
                  ['out', 'دين عليّ (عليه)'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setMode(k);
                    setApplyNow(k === 'in');
                  }}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                    mode === k
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                البيان / الغرض
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="خبز، قهوة، خضر..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                المبلغ (دج)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {!familyEntryOnlyMode && mode !== 'cash' && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                الطرف / المحل
              </label>
              <input
                type="text"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder="اسم الشخص أو المحل"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {creditorNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {creditorNames.slice(0, 6).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setParty(n)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={applyNow}
                  onChange={(e) => setApplyNow(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  {mode === 'in'
                    ? 'إضافة فورية إلى أموال الخزينة'
                    : 'تسديد فوري الآن من الخزينة'}
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              حفظ العملية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
