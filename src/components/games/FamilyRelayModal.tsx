import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../common/MathText';
import { useParentEconomy } from '../../hooks/useParentEconomy';
import { useProfile } from '../../context/ProfileContext';
import { STORAGE_KEYS } from '../../lib/worldConfig';
import {
    RELAY_GAME_ID,
    createFamilyRelayState,
    currentKidQuestion,
    currentParentQuestion,
    getVictoryPayload,
    submitKidAnswer,
    submitParentAnswer,
    tickHighFive,
    tickParentBlitz,
    type FamilyRelayState,
} from '../../engines/familyRelayEngine';

export interface FamilyRelayModalProps {
    estimatedLevel?: number;
    onClose?: () => void;
}

function readCompletedRelayIds(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.FAMILY_RELAY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === 'string')
            : [];
    } catch {
        return [];
    }
}

function draftValue(draft: string): number | null {
    const trimmed = draft.trim();
    if (trimmed === '') return null;
    const value = Number(trimmed);
    return Number.isNaN(value) ? null : value;
}

export function FamilyRelayModal({ estimatedLevel, onClose }: FamilyRelayModalProps) {
    const { t } = useTranslation();
    const profileCtx = useProfile();
    const economy = useParentEconomy();
    const level = estimatedLevel ?? profileCtx.profile?.capabilities?.estimatedLevel ?? 1;
    const [relay, setRelay] = useState<FamilyRelayState>(() => createFamilyRelayState(level));
    const [draft, setDraft] = useState('');
    const awardedRef = useRef(false);

    useEffect(() => {
        if (relay.phase !== 'highFivePass' && relay.phase !== 'parentBlitz') return;
        const id = window.setInterval(() => {
            setRelay(prev =>
                prev.phase === 'highFivePass'
                    ? tickHighFive(prev, 1)
                    : prev.phase === 'parentBlitz'
                    ? tickParentBlitz(prev, 1)
                    : prev,
            );
        }, 1000);
        return () => window.clearInterval(id);
    }, [relay.phase]);

    useEffect(() => {
        if (relay.phase !== 'victory' || awardedRef.current) return;
        const completed = readCompletedRelayIds();
        if (completed.includes(relay.relayId)) {
            awardedRef.current = true;
            return;
        }
        if (!profileCtx.profile?.id) return;
        awardedRef.current = true;
        const payload = getVictoryPayload(relay);
        profileCtx.addCoins(payload.kidRewards.coins);
        profileCtx.addGems(payload.kidRewards.gems);
        economy.recordGameResult({
            gameId: RELAY_GAME_ID,
            score: relay.blitzCorrect ?? 0,
            won: true,
            sessionId: relay.relayId,
        });
        try {
            localStorage.setItem(
                STORAGE_KEYS.FAMILY_RELAY,
                JSON.stringify([...completed, relay.relayId]),
            );
        } catch {
            /* ignore */
        }
    }, [relay, profileCtx, economy]);

    const submitKid = () => {
        setRelay(prev => submitKidAnswer(prev, draftValue(draft)));
        setDraft('');
    };
    const submitBlitz = () => {
        setRelay(prev => submitParentAnswer(prev, draftValue(draft)));
        setDraft('');
    };

    const kidQuestion = currentKidQuestion(relay);
    const parentQuestion = currentParentQuestion(relay);
    const victory = relay.phase === 'victory' ? getVictoryPayload(relay) : null;

    return (
        <div data-testid="family-relay-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{t('familyRelay.title')}</h2>
                    {onClose && (
                        <button data-testid="family-relay-close" onClick={onClose} aria-label={t('familyRelay.close')}>
                            ✕
                        </button>
                    )}
                </div>
                {relay.phase === 'kidShields' && kidQuestion && (
                    <div>
                        <p className="mb-2 text-sm text-slate-500">
                            {t('familyRelay.kidTurn')} ·{' '}
                            {t('familyRelay.questionProgress', { current: kidQuestion.index + 1, total: kidQuestion.total })}
                        </p>
                        <div data-testid="family-relay-kid-question" className="my-4 text-center text-3xl font-bold">
                            <MathText>{`${kidQuestion.a} ${kidQuestion.op} ${kidQuestion.b}`}</MathText>
                        </div>
                        <input
                            data-testid="family-relay-kid-answer"
                            type="number"
                            inputMode="numeric"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            placeholder={t('familyRelay.answerPlaceholder')}
                            className="mb-3 w-full rounded-lg border p-2 text-center"
                        />
                        <button data-testid="family-relay-kid-submit" onClick={submitKid} className="w-full rounded-lg bg-blue-600 py-2 text-white">
                            {t('familyRelay.submit')}
                        </button>
                    </div>
                )}
                {relay.phase === 'highFivePass' && (
                    <div data-testid="family-relay-pass" className="text-center">
                        <p className="mb-2 text-lg font-semibold">{t('familyRelay.highFiveTitle')}</p>
                        <p className="mb-4 text-sm text-slate-600">{t('familyRelay.highFiveDesc')}</p>
                        <p data-testid="family-relay-pass-countdown" className="text-3xl font-bold">
                            {relay.secondsLeft}
                        </p>
                    </div>
                )}
                {relay.phase === 'parentBlitz' && parentQuestion && (
                    <div data-testid="family-relay-blitz">
                        <p className="mb-2 text-sm text-slate-500">
                            {t('familyRelay.parentTurn')} ·{' '}
                            <span data-testid="family-relay-blitz-countdown">{relay.secondsLeft}</span>s
                        </p>
                        <div className="my-4 text-center text-3xl font-bold">
                            <MathText>{`${parentQuestion.a} ${parentQuestion.op} ${parentQuestion.b}`}</MathText>
                        </div>
                        <input
                            data-testid="family-relay-blitz-answer"
                            type="number"
                            inputMode="numeric"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            placeholder={t('familyRelay.answerPlaceholder')}
                            className="mb-3 w-full rounded-lg border p-2 text-center"
                        />
                        <button data-testid="family-relay-blitz-submit" onClick={submitBlitz} className="w-full rounded-lg bg-emerald-600 py-2 text-white">
                            {t('familyRelay.submit')}
                        </button>
                    </div>
                )}
                {relay.phase === 'victory' && victory && (
                    <div data-testid="family-relay-victory" className="text-center">
                        <h3 className="mb-3 text-xl font-bold">{t('familyRelay.victoryTitle')}</h3>
                        <p className="mb-1 text-lg">
                            {t('familyRelay.kidReward', { coins: victory.kidRewards.coins, gems: victory.kidRewards.gems })}
                        </p>
                        <p className="mb-4 text-lg">
                            {t('familyRelay.parentReward', { coins: victory.parentRewards.coins })}
                        </p>
                        {onClose && (
                            <button data-testid="family-relay-close" onClick={onClose} className="w-full rounded-lg border py-2">
                                {t('familyRelay.close')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
