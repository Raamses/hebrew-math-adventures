import React from 'react';

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = 'text-slate-700' }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-3xl mb-1">{icon}</div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs font-medium text-slate-400 text-center mt-0.5">{label}</div>
        </div>
    );
};