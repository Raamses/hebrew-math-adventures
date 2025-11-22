import React from 'react';
import { ThemeSelector } from './ThemeSelector';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <ThemeSelector isOpen={isOpen} onClose={onClose} />
    );
};
