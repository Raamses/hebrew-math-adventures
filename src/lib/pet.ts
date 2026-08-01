import type { PetSpecies, PetState } from '../types/user';

export interface PetStage { index: 0|1|2|3|4; key: 'egg'|'baby'|'child'|'teen'|'adult'; minLevel: number; }
export const PET_STAGES: PetStage[] = [
  { index:0, key:'egg',   minLevel:1 },
  { index:1, key:'baby',  minLevel:2 },
  { index:2, key:'child', minLevel:4 },
  { index:3, key:'teen',  minLevel:6 },
  { index:4, key:'adult', minLevel:8 },
];

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