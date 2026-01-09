import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Play, RotateCcw, Home, X, Settings, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

// --- Types ---
interface GameMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestart: () => void;
    onExit: () => void;
    onSettings: () => void;
}

interface MenuButtonProps {
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    variant: 'primary' | 'secondary' | 'neutral' | 'danger';
}

// --- Animation Variants ---
const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", duration: 0.5, bounce: 0.3 }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 10,
        transition: { duration: 0.2, ease: "easeOut" } // Faster exit for snappy feel
    }
};

const containerVariants: Variants = {
    visible: {
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    },
    exit: {
        transition: { staggerChildren: 0.02, staggerDirection: -1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, x: -10 }
};

// --- Sub-components ---
const MenuButton: React.FC<MenuButtonProps> = ({ onClick, icon: Icon, label, variant }) => {
    const baseStyles = "w-full py-4 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all";

    const variantsStyles = {
        primary: "bg-green-500 hover:bg-green-600 shadow-green-500/20",
        secondary: "bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20",
        neutral: "bg-slate-600 hover:bg-slate-700 shadow-slate-600/20",
        danger: "bg-red-500 hover:bg-red-600 shadow-red-500/20"
    };

    return (
        <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(baseStyles, variantsStyles[variant])}
            aria-label={label}
        >
            <Icon size={28} className="stroke-[2.5]" aria-hidden="true" />
            <span>{label}</span>
        </motion.button>
    );
};

export const GameMenuModal: React.FC<GameMenuModalProps> = ({ isOpen, onClose, onRestart, onExit, onSettings }) => {
    const { t } = useTranslation();

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="menu-title"
                    >
                        <div className="bg-white rounded-3xl p-8 w-[90%] max-w-[400px] shadow-2xl pointer-events-auto relative">

                            {/* Header/Close */}
                            <div className="flex justify-between items-center mb-8">
                                <h2 id="menu-title" className="text-3xl font-bold text-slate-800">
                                    {t('menu.paused')}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    aria-label={t('common.close')}
                                >
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Buttons Container */}
                            <motion.div
                                className="flex flex-col gap-4"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <MenuButton
                                    label={t('menu.resume')}
                                    icon={Play}
                                    onClick={onClose}
                                    variant="primary"
                                />
                                <MenuButton
                                    label={t('menu.restart')}
                                    icon={RotateCcw}
                                    onClick={onRestart}
                                    variant="secondary"
                                />
                                <MenuButton
                                    label={t('menu.settings')}
                                    icon={Settings}
                                    onClick={onSettings}
                                    variant="neutral"
                                />
                                <MenuButton
                                    label={t('menu.exitToMap')}
                                    icon={Home}
                                    onClick={onExit}
                                    variant="danger"
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
