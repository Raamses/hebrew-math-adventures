import React, { useState, useRef, useEffect } from 'react';
import { Settings, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
    const { t, i18n } = useTranslation();

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

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'he' ? 'en' : 'he';
        i18n.changeLanguage(newLang);
    };

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
                        className="absolute top-full mt-2 end-0 bg-white rounded-2xl shadow-xl p-2 flex flex-col gap-2 min-w-[200px]"
                    >
                        {/* Sound Toggle */}
                        <button
                            onClick={onToggleMute}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3"
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            <span className="font-medium text-sm">{isMuted ? t('menu.unmute') : t('menu.mute')}</span>
                        </button>

                        {/* Pause / Menu */}
                        <button
                            onClick={() => {
                                onPause();
                                setIsOpen(false);
                            }}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3"
                        >
                            <Pause size={20} />
                            <span className="font-medium text-sm">{t('menu.pause')}</span>
                        </button>

                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3"
                        >
                            <span className="font-bold text-lg w-5 text-center">{i18n.language === 'he' ? 'EN' : 'עב'}</span>
                            <span className="font-medium text-sm">{i18n.language === 'he' ? 'Switch to English' : 'עבור לעברית'}</span>
                        </button>

                        {/* Full Settings */}
                        <button
                            onClick={() => {
                                onOpenSettings();
                                setIsOpen(false);
                            }}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3 border-t-2 border-slate-100 mt-1"
                        >
                            <Settings size={20} />
                            <span className="font-medium text-sm">{t('menu.settings')}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
