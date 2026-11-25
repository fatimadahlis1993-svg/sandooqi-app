import React, { useState } from 'react';
import { Delete, Lock, Unlock } from 'lucide-react';
import { verifyPin } from '../utils/storage';

interface AppLockOverlayProps {
  storedPin: string;
  onUnlock: () => void;
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'مسح', '0', '⌫'];

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({ storedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const attemptUnlock = async (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    try {
      const ok = await verifyPin(trimmed, storedPin);
      if (ok) {
        setPin('');
        setError('');
        onUnlock();
      } else {
        setError('الرمز السري غير صحيح');
        setPin('');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleKeyPress = (k: string) => {
    setError('');
    if (k === 'مسح') {
      setPin('');
      return;
    }
    if (k === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    const next = pin + k;
    setPin(next);
    if (next.length === 4 && (!storedPin || storedPin === '1234')) {
      void attemptUnlock(next);
    }
  };

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fdf8ef] p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
          <Lock className="h-7 w-7 text-amber-300" />
        </div>
        <h1 className="mt-3 text-lg font-bold">صندوقي مقفل</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {storedPin === '1234'
            ? 'أدخل الرمز السري للفتح (الافتراضي: 1234)'
            : 'أدخل الرمز السري الخاص بك للفتح'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attemptUnlock(pin);
          }}
          className="mt-4 space-y-3"
        >
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setError('');
              setPin(e.target.value);
            }}
            placeholder="••••"
            className="tabular-nums w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
          />

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

          <div className="grid grid-cols-3 gap-2 pt-1" dir="ltr">
            {KEYPAD.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKeyPress(k)}
                className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-bold text-slate-800 active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {k === '⌫' ? <Delete className="h-4 w-4" /> : k === 'مسح' ? <span className="text-xs">مسح</span> : k}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!pin.trim() || checking}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" />
            <span>{checking ? 'جاري التحقق...' : 'فتح التطبيق'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
