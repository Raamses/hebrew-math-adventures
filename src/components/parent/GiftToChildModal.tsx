/**
 * GiftToChildModal.tsx — Modal for gifting parent coins to a child profile.
 *
 * Shows child profiles, validates gift amounts, and calls onConfirm
 * with the selected child and amount.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Gift, Coins } from 'lucide-react';
import type { ParentEconomyState, GiftTransaction } from '../../types/parent';
import {
    validateGift,
    MAX_DAILY_GIFT_PER_CHILD,
    MAX_DAILY_GIFT_TOTAL,
} from './games/parentEconomyEngine';

interface ChildProfile {
    id: string;
    name: string;
    coins?: number;
}

interface GiftToChildModalProps {
    state: ParentEconomyState;
    childProfiles: ChildProfile[];
    onConfirm: (childId: string, childName: string, amount: number) => void;
    onClose: () => void;
}

export function GiftToChildModal({ state, childProfiles, onConfirm, onClose }: GiftToChildModalProps) {
    const { t } = useTranslation();
    const [selectedChild, setSelectedChild] = useState<string>('');
    const [amount, setAmount] = useState<number>(10);

    const today = new Date().toISOString().slice(0, 10);
    const todaysGifts = (state.giftHistory ?? []).filter((g: GiftTransaction) => g.date === today);
    const totalToday = todaysGifts.reduce((sum: number, g: GiftTransaction) => sum + g.amount, 0);
    const remainingDaily = MAX_DAILY_GIFT_TOTAL - totalToday;

    const error = useMemo(() => {
        if (!selectedChild) return null;
        return validateGift(state, selectedChild, amount, today);
    }, [state, selectedChild, amount]);

    const canConfirm = selectedChild && amount > 0 && !error && amount <= state.coins;

    const handleConfirm = () => {
        if (!canConfirm || !selectedChild) return;
        const child = childProfiles.find((c) => c.id === selectedChild);
        if (!child) return;
        onConfirm(child.id, child.name, amount);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <Gift className="w-5 h-5 text-amber-500" />
                        {t('parent.economy.giftToChild')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Balance */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Coins className="w-4 h-4 text-amber-500" />
                        {t('parent.economy.balance')}: {state.coins}
                    </div>

                    {/* Daily limit info */}
                    <div className="text-xs text-gray-400">
                        {t('parent.economy.dailyRemaining')}: {remainingDaily} / {MAX_DAILY_GIFT_TOTAL}
                    </div>

                    {/* Child selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('parent.economy.selectChild')}
                        </label>
                        <select
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
                        >
                            <option value="">{t('parent.economy.chooseChild')}</option>
                            {childProfiles.map((child) => (
                                <option key={child.id} value={child.id}>
                                    {child.name} ({child.coins ?? 0} {t('parent.economy.coins')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('parent.economy.amount')}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                max={Math.min(state.coins, MAX_DAILY_GIFT_PER_CHILD, remainingDaily)}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
                            />
                            <div className="flex gap-1">
                                {[5, 10, 20].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setAmount(v)}
                                        className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                            {t('parent.economy.maxPerChild')}: {MAX_DAILY_GIFT_PER_CHILD}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-500">
                            {t(`parent.economy.errors.${error}`)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {t('parent.economy.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="px-4 py-2 rounded-lg text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('parent.economy.sendGift')}
                    </button>
                </div>
            </div>
        </div>
    );
}
