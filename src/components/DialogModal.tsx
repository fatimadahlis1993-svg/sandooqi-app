import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ConfirmModalRequest {
  kind: 'confirm';
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface InputModalRequest {
  kind: 'input';
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  inputType?: 'text' | 'number' | 'password';
  checkboxLabel?: string;
  checkboxDefault?: boolean;
  confirmLabel?: string;
  onSubmit: (value: string, checked: boolean) => void;
}

export type ModalRequest = ConfirmModalRequest | InputModalRequest | null;

interface DialogModalProps {
  request: ModalRequest;
  onClose: () => void;
}

export const DialogModal: React.FC<DialogModalProps> = ({ request, onClose }) => {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (request?.kind === 'input') {
      setValue(request.initialValue || '');
      setChecked(Boolean(request.checkboxDefault));
    }
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {request.title}
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

        {request.message && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {request.message}
          </p>
        )}

        {request.kind === 'confirm' ? (
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                request.onConfirm();
                onClose();
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                request.danger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {request.confirmLabel || 'تأكيد'}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              request.onSubmit(value, checked);
              onClose();
            }}
            className="mt-4 space-y-3"
          >
            <input
              type={request.inputType || 'text'}
              value={value}
              autoFocus
              placeholder={request.placeholder}
              onChange={(e) => setValue(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {request.checkboxLabel && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>{request.checkboxLabel}</span>
              </label>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {request.confirmLabel || 'حفظ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
