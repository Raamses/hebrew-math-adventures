import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { getInitialLevel } from '../types/user';
import { User, Calendar } from 'lucide-react';

export const ProfileSetup: React.FC = () => {
    const { setProfile } = useProfile();
    const [name, setName] = useState('');
    const [age, setAge] = useState(6);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setProfile({
            name,
            age,
            currentLevel: getInitialLevel(age),
            xp: 0,
            streak: 0
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-100 to-purple-100">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
                <h1 className="text-4xl font-bold text-primary mb-2">ברוכים הבאים!</h1>
                <p className="text-slate-500 mb-8">בואו נכיר אחד את השני</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 text-right">
                        <label className="text-slate-700 font-bold flex items-center gap-2 flex-row-reverse">
                            <User size={20} />
                            ?איך קוראים לך
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 text-xl bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-primary outline-none text-right"
                            placeholder="השם שלך..."
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2 text-right">
                        <label className="text-slate-700 font-bold flex items-center gap-2 flex-row-reverse">
                            <Calendar size={20} />
                            ?בן/בת כמה את/ה
                        </label>
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                            <span className="text-2xl font-bold text-primary w-12 text-center">{age}</span>
                            <input
                                type="range"
                                min="6"
                                max="12"
                                value={age}
                                onChange={(e) => setAge(parseInt(e.target.value))}
                                className="w-full mx-4 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <p className="text-sm text-slate-400 text-center mt-1">
                            {age === 6 ? 'מתחילים מהבסיס (רמה 1)' :
                                age >= 11 ? 'אתגר למתקדמים (רמה 6)' :
                                    `מתחילים ברמה ${getInitialLevel(age)}`}
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-xl shadow-lg shadow-orange-500/30 mt-4 transition-all active:scale-95"
                    >
                        מתחילים לשחק!
                    </button>
                </form>
            </div>
        </div>
    );
};
