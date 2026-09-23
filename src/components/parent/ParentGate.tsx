import React, { useState } from 'react';
import { X, Lock, RefreshCw, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Mascot, type MascotCharacter } from '../mascot/Mascot';

export interface ParentGateProps {
  onSuccess: () => void;
  onCancel: () => void;
  onClose?: () => void;
  origin?: 'select' | 'map';
  activeMascot?: MascotCharacter | string;
  mascot?: MascotCharacter | string;
  mascotId?: MascotCharacter | string;
}

export function getInWorldCopy(mascot: string = 'bear'): string {
  const m = mascot.toLowerCase();
  let callToAction = 'עזרו לדב לפתוח את השער';
  if (m === 'owl' || m === 'ינשוף') {
    callToAction = 'עזרו לינשוף לפתוח את השער';
  } else if (m === 'ant' || m === 'נמלה') {
    callToAction = 'עזרו לנמלה לפתוח את השער';
  } else if (m === 'lion' || m === 'אריה') {
    callToAction = 'עזרו לאריה לפתוח את השער';
  } else if (m === 'bear' || m === 'דב' || m === 'דוב') {
    callToAction = 'עזרו לדב לפתוח את השער';
  } else {
    callToAction = `עזרו ל${mascot} לפתוח את השער`;
  }
  return `רגע של גדולים — ${callToAction}`;
}

const isKnownMascot = (m: string): m is MascotCharacter => {
  return ['owl', 'bear', 'ant', 'lion'].includes(m);
};

export const ParentGate: React.FC<ParentGateProps> = ({
  onSuccess,
  onCancel,
  onClose,
  origin = 'select',
  activeMascot,
  mascot,
  mascotId,
}) => {
  const { i18n } = useTranslation();
  const currentMascot = activeMascot || mascot || mascotId || 'bear';

  const mascotChar: MascotCharacter = isKnownMascot(currentMascot)
    ? currentMascot
    : currentMascot === 'דב' || currentMascot === 'דוב'
    ? 'bear'
    : currentMascot === 'ינשוף'
    ? 'owl'
    : currentMascot === 'נמלה'
    ? 'ant'
    : currentMascot === 'אריה'
    ? 'lion'
    : 'bear';

  const [problem, setProblem] = useState<{ n1: number; n2: number }>(() => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      return {
        n1: (array[0] % 40) + 10,
        n2: (array[1] % 40) + 10,
      };
    }
    return {
      n1: Math.floor(Math.random() * 40) + 10,
      n2: Math.floor(Math.random() * 40) + 10,
    };
  });

  const [answer, setAnswer] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onCancel();
    }
  };

  const generateProblem = () => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      setProblem({
        n1: (array[0] % 40) + 10,
        n2: (array[1] % 40) + 10,
      });
    } else {
      setProblem({
        n1: Math.floor(Math.random() * 40) + 10,
        n2: Math.floor(Math.random() * 40) + 10,
      });
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!problem) return;

    if (parseInt(answer, 10) === problem.n1 + problem.n2) {
      onSuccess();
    } else {
      const nextFailed = failedAttempts + 1;
      if (nextFailed >= 2) {
        // Kid-bypass: 2 failed attempts -> smooth transition back, NO error sounds or penalties
        handleClose();
      } else {
        setFailedAttempts(nextFailed);
        setAnswer('');
        generateProblem();
        setMascotMessage('לא נורא, בוא ננסה שאלה אחרת!');
      }
    }
  };

  const handleDigit = (digit: string) => {
    setAnswer((prev) => (prev.length < 3 ? prev + digit : prev));
  };

  const handleBackspace = () => {
    setAnswer((prev) => prev.slice(0, -1));
  };

  const handleAnotherProblem = () => {
    generateProblem();
    setAnswer('');
    setMascotMessage(null);
  };

  return (
    <div
      data-testid="parent-gate"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      dir={i18n.dir ? i18n.dir() : 'rtl'}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-[393px] relative flex flex-col items-center gap-3">
        {/* Cancel (X) button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="סגור"
          data-testid="parent-gate-cancel"
        >
          <X size={22} />
        </button>

        {/* Origin-based friction delta note (MAP origin only) */}
        {origin === 'map' && (
          <div
            data-testid="parent-gate-friction-hint"
            className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100/90 rounded-full px-3 py-1 select-none"
          >
            <Lock size={12} className="text-slate-400" />
            <span>כניסה מאובטחת</span>
          </div>
        )}

        {/* In-world Hebrew copy at the top */}
        <h2
          className="text-lg font-bold text-center text-slate-800 px-6 pt-1 leading-snug"
          data-testid="parent-gate-title"
        >
          {getInWorldCopy(currentMascot)}
        </h2>

        {/* Mascot Handover Frame: child's active mascot holds a clipboard */}
        <div
          data-testid="parent-gate-mascot-frame"
          className="w-full flex flex-col items-center gap-2 mt-1"
        >
          <div className="relative">
            <Mascot
              character={mascotChar}
              emotion={failedAttempts > 0 ? 'encourage' : 'thinking'}
              size="sm"
              className="w-20 h-20"
            />
          </div>

          {/* Clipboard with arithmetic question */}
          <div
            data-testid="parent-gate-clipboard"
            className="w-full max-w-[280px] bg-amber-50/90 border-2 border-amber-200/90 rounded-2xl p-4 shadow-sm relative pt-5 flex flex-col items-center"
          >
            {/* Clipboard metallic clip */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-slate-300 border border-slate-400 rounded-md shadow-xs flex items-center justify-center">
              <div className="w-6 h-1 bg-slate-400 rounded-full" />
            </div>

            <div
              data-testid="parent-gate-problem"
              className="text-3xl font-extrabold text-slate-800 tracking-wider text-center select-none"
              dir="ltr"
            >
              {problem.n1} + {problem.n2} = ?
            </div>

            {/* Gentle mascot line on failed attempt */}
            {mascotMessage && (
              <p
                data-testid="parent-gate-mascot-message"
                className="text-xs text-amber-900 font-medium text-center mt-2"
              >
                {mascotMessage}
              </p>
            )}
          </div>
        </div>

        {/* Input and Keypad Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-3 mt-1">
          <input
            data-testid="parent-gate-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setAnswer(val.slice(0, 3));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              }
            }}
            maxLength={3}
            aria-label="תשובה"
            className="w-full max-w-[220px] text-center text-3xl font-bold py-2 px-4 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none tracking-widest bg-slate-50 text-slate-800"
            placeholder="?"
            dir="ltr"
            autoFocus
          />

          {/* 3x4 numeric keypad: 56px keys, thumb-friendly, RTL-friendly layout */}
          <div
            className="grid grid-cols-3 gap-2 w-full max-w-[260px]"
            dir="ltr"
            data-testid="parent-gate-keypad"
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-14 min-h-[56px] text-2xl font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-2xl border border-slate-200/80 transition-all active:scale-95 shadow-sm touch-manipulation flex items-center justify-center cursor-pointer select-none"
                data-testid={`parent-gate-key-${digit}`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="מחק"
              className="h-14 min-h-[56px] text-xl font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 rounded-2xl border border-slate-200/80 transition-all active:scale-95 shadow-sm touch-manipulation flex items-center justify-center cursor-pointer select-none"
              data-testid="parent-gate-key-backspace"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 min-h-[56px] text-2xl font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-2xl border border-slate-200/80 transition-all active:scale-95 shadow-sm touch-manipulation flex items-center justify-center cursor-pointer select-none"
              data-testid="parent-gate-key-0"
            >
              0
            </button>
            <button
              type="submit"
              aria-label="אישור"
              className="h-14 min-h-[56px] text-xl font-bold bg-primary hover:bg-primary/90 active:bg-primary/80 text-white rounded-2xl transition-all active:scale-95 shadow-md touch-manipulation flex items-center justify-center cursor-pointer select-none"
              data-testid="parent-gate-key-submit"
            >
              <Check size={26} strokeWidth={3} />
            </button>
          </div>
        </form>

        {/* 'שאלה אחרת' (another problem) button */}
        <button
          type="button"
          onClick={handleAnotherProblem}
          className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-slate-100 cursor-pointer"
          data-testid="parent-gate-another-problem"
        >
          <RefreshCw size={14} />
          <span>שאלה אחרת</span>
        </button>
      </div>
    </div>
  );
};
