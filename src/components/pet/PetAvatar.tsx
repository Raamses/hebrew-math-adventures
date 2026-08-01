import React from 'react';
import { getPetEmoji, getPetStage } from '../../lib/pet';
import type { PetState } from '../../types/user';

interface PetAvatarProps {
  pet: PetState;
  level: number;
  variant?: 'badge' | 'hero';
  className?: string;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({ pet, level, variant = 'badge', className = '' }) => {
  const emoji = getPetEmoji(pet.species, level);
  const stage = getPetStage(level);
  const size = variant === 'hero' ? 'text-6xl' : 'text-2xl';
  return (
    <div className={`inline-flex items-center justify-center ${size} ${className}`} aria-label={`${pet.name} (${stage.key})`}>
      {emoji}
    </div>
  );
};