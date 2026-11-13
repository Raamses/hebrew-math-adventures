import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Lock, Play } from 'lucide-react';

import {
  GAMES,
  gameDescriptionKey,
  gameTitleKey,
  getGameById,
  type GameDefinition,
  type GameId,
} from './games/registry';
import {
  ParentEconomyProvider,
  useParentEconomyContext,
} from '../../context/ParentEconomyContext';

type HubView = 'list' | 'playing';

export interface ToastData {
  coins: number;
  session: number;
}

export function ParentGamesEconomyToast({
  toast,
  onClear,
}: {
  toast: ToastData | null;
  onClear: () => void;
}) {
  useParentEconomyContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClear();
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast, onClear]);

  if (!toast) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-24 z-50 flex justify-center pointer-events-none"
      data-testid="parent-games-coin-toast"
      role="status"
      aria-live="polite"
    >
      <div className="bg-amber-500 text-white shadow-lg px-4 py-2 rounded-full font-bold flex items-center gap-1.5 pointer-events-auto">
        {toast.coins > 0 ? (
          <>
            <span data-testid="parent-games-coin-toast-amount">+{toast.coins}</span>
            <span>{t('parent.games.coinToast.earned')}</span>
          </>
        ) : (
          <span data-testid="parent-games-coin-toast-zero">
            {t('parent.games.coinToast.zero')}
          </span>
        )}
      </div>
    </div>
  );
}

function ParentGamesHubContent() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<HubView>('list');
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [lastToast, setLastToast] = useState<ToastData | null>(null);

  const isRtl = i18n.dir() === 'rtl';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const openGame = useCallback((game: GameDefinition) => {
    if (game.status !== 'available') return;
    setSelectedGameId(game.id);
    setView('playing');
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setSelectedGameId(null);
  }, []);

  const handleCoinsEarned = useCallback((coins: number) => {
    setLastToast({ coins, session: Date.now() });
  }, []);

  const clearToast = useCallback(() => {
    setLastToast(null);
  }, []);

  const selectedGame = getGameById(selectedGameId);

  return (
    <>
      {view === 'playing' && selectedGame?.status === 'available' ? (
        <div className="flex flex-col gap-4" data-testid="game-view">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToList}
              data-testid="back-button"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <BackIcon className="h-4 w-4" aria-hidden="true" />
              {t('parent.games.back')}
            </button>
            <h2 className="text-lg font-semibold text-slate-900">
              {t(gameTitleKey(selectedGame))}
            </h2>
          </div>

          <selectedGame.component
            onExit={backToList}
            onCoinsEarned={handleCoinsEarned}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6" data-testid="games-list">
          <header className="text-start">
            <h2 className="text-xl font-bold text-slate-900">
              {t('parent.games.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('parent.games.subtitle')}
            </p>
          </header>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GAMES.map((game) => {
              const Icon = game.icon;
              const isAvailable = game.status === 'available';

              return (
                <li key={game.id}>
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => openGame(game)}
                    data-testid={`game-card-${game.id}`}
                    className={[
                      'group flex w-full items-start gap-4 rounded-2xl border p-4 text-start transition',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      isAvailable
                        ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                        : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 opacity-70',
                    ].join(' ')}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${game.accentClass}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-900">
                          {t(gameTitleKey(game))}
                        </span>
                        {!isAvailable && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            {t('parent.games.soon')}
                          </span>
                        )}
                      </span>

                      <span className="text-sm text-slate-500">
                        {t(gameDescriptionKey(game))}
                      </span>

                      {isAvailable && (
                        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('parent.games.play')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ParentGamesEconomyToast toast={lastToast} onClear={clearToast} />
    </>
  );
}

export function ParentGamesHub() {
  return (
    <ParentEconomyProvider>
      <ParentGamesHubContent />
    </ParentEconomyProvider>
  );
}

export default ParentGamesHub;
