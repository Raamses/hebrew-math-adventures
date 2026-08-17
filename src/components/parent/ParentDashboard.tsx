import React from 'react';
import { Trash2, LogOut, AlertTriangle, Edit } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useTranslation } from 'react-i18next';
import { EditProfileModal } from './EditProfileModal';
import type { UserProfile } from '../../types/user';

interface ParentDashboardProps {
    onExit: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit }) => {
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
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">{t('parent.title')}</h1>
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold bg-white px-4 py-2 rounded-lg shadow-sm"
                    >
                        <LogOut size={20} />
                        {t('parent.exit')}
                    </button>
                </header>

                <div className="grid gap-6">
                    {/* Profiles Management */}
                    <section className="bg-white rounded-2xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <span className="text-2xl">👥</span> {t('parent.manageProfiles')}
                        </h2>

                        <div className="min-w-full inline-block align-middle">
                            <div className="border rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-100 py-3 px-4 text-sm font-bold text-slate-500">
                                    <div className="col-span-4">{t('parent.table.name')}</div>
                                    <div className="col-span-1 text-center">{t('parent.table.age')}</div>
                                    <div className="col-span-3 text-center">{t('settings.tabs.mascot')}</div>
                                    <div className="col-span-2 text-center">{t('app.streakTooltip')}</div>
                                    <div className="col-span-2 text-center">{t('parent.table.actions')}</div>
                                </div>

                                {/* Rows */}
                                <div className="divide-y divide-slate-50">
                                    {allProfiles.map(profile => (
                                        <div key={profile.id} className="grid grid-cols-12 items-center py-4 px-4 hover:bg-slate-50/80 transition-colors group">
                                            {/* Name & Avatar */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xl shadow-sm border border-indigo-100">
                                                    {profile.avatarId}
                                                </div>
                                                <div className="font-bold text-slate-700 truncate">{profile.name}</div>
                                            </div>

                                            {/* Stats */}
                                            <div className="col-span-1 text-center font-bold text-slate-600 bg-slate-100/50 py-1 rounded-lg mx-1">{profile.age}</div>
                                            <div className="col-span-3 text-center text-slate-600 capitalize">{profile.mascotId}</div>
                                            <div className="col-span-2 text-center font-bold text-primary flex items-center justify-center gap-1">
                                                <span>⚡</span> {profile.streak || 0}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2 flex justify-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingProfile(profile)}
                                                    className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-all shadow-sm border border-blue-100 hover:border-blue-500"
                                                    title={t('parent.edit.tooltip')}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(profile.id, profile.name)}
                                                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all shadow-sm border border-red-100 hover:border-red-500"
                                                    title={t('parent.delete.tooltip')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty State */}
                                    {allProfiles.length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <div className="mb-2 text-4xl">📭</div>
                                            <p>{t('parent.table.noProfiles')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors"
                        >
                            {t('parent.danger.reset')}
                        </button>
                    </section>
                </div>
            </div>

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
