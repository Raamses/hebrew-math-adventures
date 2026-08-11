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
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                aria-label={t('menu.settings')}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className={`p-2 rounded-full shadow-md transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none ${isOpen ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:text-primary'
                    }`}
            >
                <Settings size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute top-full mt-2 end-0 bg-white rounded-2xl shadow-xl p-2 flex flex-col gap-2 min-w-[200px]"
                    >
                        {/* Sound Toggle */}
                        <button
                            role="menuitem"
                            onClick={onToggleMute}
                            data-testid="mute-toggle"
                            aria-label={isMuted ? t('menu.unmute') : t('menu.mute')}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
                            <span className="font-medium text-sm">{isMuted ? t('menu.unmute') : t('menu.mute')}</span>
                        </button>

                        {/* Pause / Menu */}
                        <button
                            role="menuitem"
                            onClick={() => {
                                onPause();
                                setIsOpen(false);
                            }}
                            aria-label={t('menu.pause')}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <Pause size={20} aria-hidden="true" />
                            <span className="font-medium text-sm">{t('menu.pause')}</span>
                        </button>

                        {/* Language Toggle */}
                        <button
                            role="menuitem"
                            data-testid="language-toggle"
                            onClick={toggleLanguage}
                            aria-label={i18n.language === 'he' ? 'Switch to English' : 'עבור לעברית'}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <span className="font-bold text-lg w-5 text-center" aria-hidden="true">{i18n.language === 'he' ? 'EN' : 'עב'}</span>
                            <span className="font-medium text-sm">{i18n.language === 'he' ? 'Switch to English' : 'עבור לעברית'}</span>
                        </button>

                        {/* Full Settings */}
                        <button
                            role="menuitem"
                            onClick={() => {
                                onOpenSettings();
                                setIsOpen(false);
                            }}
                            aria-label={t('menu.settings')}
                            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center gap-3 border-t-2 border-slate-100 mt-1 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            <Settings size={20} aria-hidden="true" />
                            <span className="font-medium text-sm">{t('menu.settings')}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
