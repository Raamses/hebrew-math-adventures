import React from 'react';
import { Trophy, Star, Zap } from 'lucide-react';

interface MyWorldProps {
    score: number;
    streak: number;
    level: number;
}

export const MyWorld: React.FC<MyWorldProps> = ({ score, streak, level }) => {
    return (
        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-md flex flex-col items-center justify-center gap-2">
                <div className="bg-yellow-100 p-2 rounded-full text-yellow-500">
                    <Trophy size={24} />
                </div>
                <span className="text-sm text-slate-500 font-medium">ניקוד</span>
                <span className="text-2xl font-bold text-slate-800">{score}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-md flex flex-col items-center justify-center gap-2">
                <div className="bg-orange-100 p-2 rounded-full text-orange-500">
                    <Zap size={24} />
                </div>
                <span className="text-sm text-slate-500 font-medium">רצף</span>
                <span className="text-2xl font-bold text-slate-800">{streak}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-md flex flex-col items-center justify-center gap-2">
                <div className="bg-purple-100 p-2 rounded-full text-purple-500">
                    <Star size={24} />
                </div>
                <span className="text-sm text-slate-500 font-medium">שלב</span>
                <span className="text-2xl font-bold text-slate-800">{level}</span>
            </div>
        </div>
    );
};
