import React from 'react';
import { Trash2, AlertTriangle, Edit } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useTranslation } from 'react-i18next';
import { EditProfileModal } from './EditProfileModal';
import type { UserProfile } from '../../types/user';

export const ProfileManager: React.FC = () => {
    const { allProfiles, deleteProfile, updateProfile } = useProfile();
    const { t } = useTranslation();
    const [editingProfile, setEditingProfile] = React.useState<UserProfile | null>(null);

    const handleDelete = (id: string, name: string) => {
        if (confirm(t('parent.delete.confirm', { name }))) {
            deleteProfile(id);
        }
    };

    const handleSaveProfile = (id: string, updates: Partial<UserProfile>) => {
        updateProfile(id, updates);
        setEditingProfile(null);
    };

    return (
        <div className="space-y-6">
            {/* Profiles Management — Stacked Cards (mobile-first) */}
            <section>
                <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="text-2xl">👥</span> {t('parent.manageProfiles')}
                </h2>

                <div className="space-y-3">
                    {allProfiles.map(profile => (
                        <div
                            key={profile.id}
                            className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100"
                        >
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl shadow-sm border border-indigo-100 shrink-0">
                                {profile.avatarId}
                            </div>

                            {/* Name + Age + Mascot */}
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-700 truncate">{profile.name}</div>
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <span>{profile.age}</span>
                                    <span>·</span>
                                    <span className="capitalize">{profile.mascotId}</span>
                                </div>
                            </div>

                            {/* Streak Badge */}
                            <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full text-xs font-bold text-orange-600 shrink-0">
                                <span>⚡</span> {profile.streak || 0}
                            </div>

                            {/* Action Buttons — 44px tap targets */}
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setEditingProfile(profile)}
                                    className="w-11 h-11 flex items-center justify-center text-blue-500 hover:text-white hover:bg-blue-500 rounded-xl transition-all shadow-sm border border-blue-100 hover:border-blue-500"
                                    aria-label={t('parent.edit.tooltip', 'עריכת פרופיל')}
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(profile.id, profile.name)}
                                    className="w-11 h-11 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all shadow-sm border border-red-100 hover:border-red-500"
                                    aria-label={t('parent.delete.tooltip', 'מחיקת פרופיל')}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {allProfiles.length === 0 && (
                        <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                            <div className="mb-2 text-4xl">📭</div>
                            <p>{t('parent.table.noProfiles')}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <h2 className="text-xl font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    {t('parent.danger.title')}
                </h2>
                <p className="text-red-600 mb-4">{t('parent.danger.warning')}</p>
                <button
                    onClick={() => {
                        if (confirm(t('parent.danger.resetConfirm'))) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors min-h-[48px]"
                >
                    {t('parent.danger.reset')}
                </button>
            </section>

            {editingProfile && (
                <EditProfileModal
                    profile={editingProfile}
                    isOpen={!!editingProfile}
                    onClose={() => setEditingProfile(null)}
                    onSave={handleSaveProfile}
                />
            )}
        </div>
    );
};
