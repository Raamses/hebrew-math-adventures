import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { Mascot, MascotCharacter } from './mascot/Mascot';

const AVATARS = ['🦁', '🐯', '🐻', '🐨', '🐼', '🐸', '🦄', '🐲', '🚀', '⭐'];
const MASCOTS: { id: MascotCharacter; name: string }[] = [
    { id: 'owl', name: 'ינשוף' },
    { id: 'bear', name: 'דוב' },
    { id: 'ant', name: 'נמלה' },
    { id: 'lion', name: 'אריה' }
];

interface ProfileSetupProps {
    onComplete?: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
    const { createProfile } = useProfile();
    const [name, setName] = useState('');
    const [age, setAge] = useState<number>(6);
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [selectedMascot, setSelectedMascot] = useState<MascotCharacter>('owl');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length > 0) {
            await createProfile(name, age, selectedAvatar, selectedMascot);
            if (onComplete) onComplete();
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-primary mb-8">ברוכים הבאים!</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Selection */}
                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg">בחר דמות:</label>
                    <div className="grid grid-cols-5 gap-2">
                        {AVATARS.map(avatar => (
                            <button
                                key={avatar}
                                type="button"
                                onClick={() => setSelectedAvatar(avatar)}
                                className={`text-3xl p-2 rounded-xl transition-all ${selectedAvatar === avatar
                                        ? 'bg-blue-100 scale-110 ring-2 ring-blue-400'
                                        : 'hover:bg-slate-50'
                                    }`}
                            >
                                {avatar}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mascot Selection */}
                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg">בחר חבר למסע:</label>
                    <div className="grid grid-cols-4 gap-2">
                        {MASCOTS.map(mascot => (
                            <button
                                key={mascot.id}
                                type="button"
                                onClick={() => setSelectedMascot(mascot.id)}
                                className={`flex flex-col items-center p-2 rounded-xl transition-all ${selectedMascot === mascot.id
                                        ? 'bg-purple-100 ring-2 ring-purple-400 scale-105'
                                        : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className="w-16 h-16">
                                    <Mascot character={mascot.id} emotion="idle" />
                                </div>
                                <span className="text-sm font-bold text-slate-600 mt-1">{mascot.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg">איך קוראים לך?</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none text-xl text-right"
                        placeholder="השם שלך..."
                        required
                    />
                </div>

                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg">בן/בת כמה את/ה?</label>
                    <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setAge(Math.max(4, age - 1))}
                            className="w-10 h-10 rounded-full bg-white shadow text-primary font-bold text-xl hover:bg-orange-50"
                        >
                            -
                        </button>
                        <span className="text-3xl font-bold text-slate-700 w-12 text-center">{age}</span>
                        <button
                            type="button"
                            onClick={() => setAge(Math.min(12, age + 1))}
                            className="w-10 h-10 rounded-full bg-white shadow text-primary font-bold text-xl hover:bg-orange-50"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-center text-slate-400 text-sm mt-2">
                        (נתאים את הרמה לגיל שלך)
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-xl shadow-lg shadow-orange-500/30 mt-4 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    בוא נתחיל!
                </button>
            </form>
        </div>
    );
};
