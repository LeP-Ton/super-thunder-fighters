import { Difficulty } from '../types';

export interface DifficultyMults {
  hp: number;
  fire: number;
  speed: number;
  playerHp: number;
}

export const getDifficultyMults = (diff: Difficulty): DifficultyMults => {
  switch (diff) {
    case 'easy':
      return { hp: 0.7, fire: 1.5, speed: 0.8, playerHp: 150 };
    case 'hard':
      return { hp: 1.3, fire: 0.8, speed: 1.2, playerHp: 80 };
    default:
      return { hp: 1.0, fire: 1.0, speed: 1.0, playerHp: 100 };
  }
};
