import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserProfile, MascotId } from '../../types/user';

interface EditProfileModalProps {
    profile: UserProfile;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<UserProfile>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: profile.name,
        age: profile.age,
        avatarId: profile.avatarId,
        mascotId: profile.mascotId
    });
    const [error, setError] = useState('');

    const avatars = ['🦁', '🐯', '🐼', '🐨', '🦊', '🐸', '🦄', '🐲'];
    const mascots: MascotId[] = ['owl', 'bear', 'ant', 'lion'];

    const handleSave = () => {
        // Validation
        if (!formData.name.trim()) {
            setError(t('parent.edit.errorName'));
            return;
        }
        if (formData.age < 4 || formData.age > 12) {
            setError(t('parent.edit.errorAge'));
            return;
        }

        onSave(profile.id, formData);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800">{t('parent.edit.title')}</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-bold">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            {/* Name & Age */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-500">{t('parent.table.name')}</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-500">{t('parent.table.age')}</label>
                                    <input
                                        type="number"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Avatar Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">{t('onboarding.selectAvatar')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {avatars.map(av => (
                                        <button
                                            key={av}
                                            onClick={() => setFormData({ ...formData, avatarId: av })}
                                            className={`w-10 h-10 text-2xl rounded-full flex items-center justify-center border-2 transition-all ${formData.avatarId === av ? 'border-primary bg-orange-50 scale-110' : 'border-transparent hover:bg-slate-50'
                                                }`}
                                        >
                                            {av}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mascot Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">{t('mascot.title')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {mascots.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setFormData({ ...formData, mascotId: m })}
                                            className={`p-2 rounded-xl border-2 transition-all text-center ${formData.mascotId === m ? 'border-primary bg-orange-50' : 'border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="text-xs font-bold capitalize">{t(`mascot.names.${m}`)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                {t('settings.close')}
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-all hover:scale-105 active:scale-95"
                            >
                                <Save size={18} />
                                {t('parent.edit.save')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
