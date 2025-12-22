import React from 'react';
import { Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useTranslation } from 'react-i18next';

interface ParentDashboardProps {
    onExit: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onExit }) => {
    const { allProfiles, deleteProfile } = useProfile();
    const { t } = useTranslation();

    const handleDelete = (id: string, name: string) => {
        if (confirm(t('parent.delete.confirm', { name }))) {
            deleteProfile(id);
        }
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
                        <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span className="text-2xl">👥</span> {t('parent.manageProfiles')}
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-start border-b border-slate-100">
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.name')}</th>
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.age')}</th>
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.level')}</th>
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.xp')}</th>
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.totalScore')}</th>
                                        <th className="pb-3 font-bold text-slate-500">{t('parent.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allProfiles.map(profile => (
                                        <tr key={profile.id} className="group">
                                            <td className="py-4 flex items-center gap-3">
                                                <span className="text-2xl">{profile.avatar}</span>
                                                <span className="font-bold text-slate-700">{profile.name}</span>
                                            </td>
                                            <td className="py-4 text-slate-600">{profile.age}</td>
                                            <td className="py-4 text-slate-600">{profile.currentLevel}</td>
                                            <td className="py-4 text-slate-600">{profile.xp}</td>
                                            <td className="py-4 text-slate-600 font-bold text-primary">{profile.totalScore || 0}</td>
                                            <td className="py-4">
                                                <button
                                                    onClick={() => handleDelete(profile.id, profile.name)}
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                                    title={t('parent.delete.tooltip')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allProfiles.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                                {t('parent.table.noProfiles')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
        </div>
    );
};
