import React, { useState, useRef, useEffect } from 'react';
import { Settings, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsMenuProps {
    onPause: () => void;
    onToggleMute: () => void;
    isMuted: boolean;
    onOpenSettings: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    onPause,
    onToggleMute,
    isMuted,
    onOpenSettings
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className={`p-2 rounded-full shadow-md transition-all ${isOpen ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:text-primary'
                    }`}
            >
                <Settings size={28} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-xl p-2 flex flex-col gap-2 min-w-[60px]"
                    >
                        {/* Sound Toggle */}
                        <button
                            onClick={() => {
                                onToggleMute();
                                // Keep open to allow multiple toggles, or close? User said "any click anywhere else... merge back", implying interacting with buttons inside keeps it open? usually pressing an action closes. But toggle mute might want to be verified. Let's keep open.
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex justify-center"
                            title={isMuted ? "בטל השתקה" : "השתק"}
                        >
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>

                        {/* Pause / Menu */}
                        <button
                            onClick={() => {
                                onPause();
                                setIsOpen(false);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex justify-center"
                            title="תפריט ראשי"
                        >
                            <Pause size={24} />
                        </button>

                        {/* Full Settings */}
                        <button
                            onClick={() => {
                                onOpenSettings();
                                setIsOpen(false);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex justify-center border-t-2 border-slate-100 mt-1"
                            title="הגדרות נוספות"
                        >
                            <Settings size={20} className="opacity-50" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
