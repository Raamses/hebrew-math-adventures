import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { ProfileSetup } from '../ProfileSetup';

interface ProfileSelectorProps {
    onParentAccess: () => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onParentAccess }) => {
    const { allProfiles, switchProfile } = useProfile();
    const [isCreating, setIsCreating] = useState(false);

    if (isCreating) {
        return (
            <div className="w-full max-w-md mx-auto">
                <button
                    onClick={() => setIsCreating(false)}
                    className="mb-4 text-slate-500 hover:text-slate-700 font-bold"
                >
                    ← חזרה
                </button>
                <ProfileSetup onComplete={() => setIsCreating(false)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-primary">מי משחק?</h1>
                    <button
                        onClick={onParentAccess}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <Users size={20} />
                        <span className="text-sm font-bold">הורים</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {allProfiles.map(profile => (
                        <button
                            key={profile.id}
                            onClick={() => switchProfile(profile.id)}
                            className="group relative flex flex-col items-center p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all active:scale-95"
                        >
                            <div className="text-6xl mb-3 transform group-hover:scale-110 transition-transform">
                                {profile.avatar}
                            </div>
                            <span className="text-xl font-bold text-slate-700 group-hover:text-blue-600">
                                {profile.name}
                            </span>
                            <span className="text-sm text-slate-400 mt-1">
                                רמה {profile.currentLevel}
                            </span>
                        </button>
                    ))}

                    {/* Add New Profile Button */}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-green-300 transition-all active:scale-95 h-full min-h-[160px]"
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-green-500">
                            <Plus size={32} />
                        </div>
                        <span className="text-lg font-bold text-slate-500">שחקן חדש</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
