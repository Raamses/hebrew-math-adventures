import type { PetSpecies, PetState } from '../types/user';
import { PET_STAGES as CONFIG_PET_STAGES } from './worldConfig';

// PET_STAGES now defined in worldConfig.ts (single source of truth).
// Re-exported here for backward compatibility.
export type PetStage = typeof CONFIG_PET_STAGES[number];
export const PET_STAGES: PetStage[] = [...CONFIG_PET_STAGES];

export function getPetStage(level: number): PetStage {
  const lvl = Number.isFinite(level) ? level : 1;
  let s = PET_STAGES[0];
  for (const st of PET_STAGES) if (lvl >= st.minLevel) s = st;
  return s;
}

const PET_EMOJI: Record<PetSpecies, string[]> = {
  owl:    ['🥚','🐣','🦉','🦉','🦅'],
  cat:    ['🥚','🐱','🐈','🐈','🐈⬛'],
  dragon: ['🥚','🐉','🐲','🐉','🐲'],
  robot:  ['📦','🤖','🤖','🦾','🦿'],
};

export const getPetEmoji = (sp: PetSpecies, lvl: number): string => PET_EMOJI[sp][getPetStage(lvl).index];

export function decayedHappiness(pet: PetState, todayISO: string): number {
  if (!pet.lastFedDate) return Math.max(50, pet.happiness);
  const days = Math.max(0, Math.round((Date.parse(todayISO) - Date.parse(pet.lastFedDate)) / 86_400_000));
  return Math.max(50, pet.happiness - days); // Floor at 50 — no dead pets for kids
}

export const PET_SPECIES_OPTIONS: { species: PetSpecies; emoji: string; name: string }[] = [
  { species: 'owl', emoji: '🦉', name: 'Owl' },
  { species: 'cat', emoji: '🐱', name: 'Cat' },
  { species: 'dragon', emoji: '🐉', name: 'Dragon' },
  { species: 'robot', emoji: '🤖', name: 'Robot' },
];