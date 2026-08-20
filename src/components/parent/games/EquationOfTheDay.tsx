import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import type { GameComponentProps } from './registry';

export function EquationOfTheDay(_: GameComponentProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="game-equation-of-the-day"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        <CalendarDays className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold text-slate-900">
        {t('parent.games.soon')}
      </h3>
      <p className="max-w-sm text-sm text-slate-500">
        {t('parent.games.stub')}
      </p>
    </div>
  );
}

export default EquationOfTheDay;
