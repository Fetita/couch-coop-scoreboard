import { describe, expect, it } from 'vitest';
import {
  describeFormat,
  formatWarnings,
  proposeFormat,
  proposeMatchesPerRound,
  proposePointsScale,
  proposeTeamSize,
} from './format';

describe('propuesta de Rocket League', () => {
  it('propone los partidos del documento de reglas en 2v2', () => {
    expect(proposeMatchesPerRound(4, 2)).toBe(3);
    expect(proposeMatchesPerRound(5, 2)).toBe(5);
  });

  it('reparte los descansos parejo', () => {
    for (let n = 4; n <= 10; n++) {
      const m = proposeMatchesPerRound(n, 2);
      const resting = n - 4;
      expect((m * resting) % n).toBe(0);
      // Alcanza para que cada pareja juegue junta al menos una vez.
      expect(m * 2).toBeGreaterThanOrEqual((n * (n - 1)) / 2);
    }
  });

  it('en 1v1 cada cruce se juega una vez', () => {
    expect(proposeMatchesPerRound(2, 1)).toBe(1);
    expect(proposeMatchesPerRound(3, 1)).toBe(3);
    expect(proposeMatchesPerRound(4, 1)).toBe(6);
  });

  it('en 3v3 con 6 jugadores no descansa nadie', () => {
    expect(proposeMatchesPerRound(6, 3)).toBe(3);
  });

  it('no propone partidos si no alcanzan los jugadores', () => {
    expect(proposeMatchesPerRound(3, 2)).toBe(0);
  });

  it('prefiere 2v2 cuando hay al menos 4 jugadores', () => {
    expect(proposeTeamSize(2)).toBe(1);
    expect(proposeTeamSize(3)).toBe(1);
    expect(proposeTeamSize(5)).toBe(2);
  });

  it('arma el formato completo', () => {
    expect(proposeFormat('rocket-league', 5)).toEqual({
      game: 'rocket-league',
      teamSize: 2,
      rounds: 1,
      matchesPerRound: 5,
      tiebreakers: ['goalDiff', 'goalsFor'],
    });
  });

  it('avisa si el tamaño de equipo no entra', () => {
    const f = { ...proposeFormat('rocket-league', 5), teamSize: 3 as const };
    expect(formatWarnings(f, 5)).toContain('Para 3v3 hacen falta al menos 6 jugadores.');
    expect(formatWarnings(proposeFormat('rocket-league', 5), 5)).toEqual([]);
  });
});

describe('propuesta de Trackmania', () => {
  it('escala de puntos 5-4-3-2-1 con 5 jugadores', () => {
    expect(proposePointsScale(5)).toEqual([5, 4, 3, 2, 1]);
  });

  it('avisa si la escala es más corta que los jugadores', () => {
    const f = proposeFormat('trackmania', 3);
    expect(formatWarnings(f, 3)).toEqual([]);
    expect(formatWarnings(f, 5)).toHaveLength(1);
  });

  it('describe el formato', () => {
    expect(describeFormat(proposeFormat('trackmania', 4))).toBe('3 pistas · puntos 4-3-2-1');
    expect(describeFormat(proposeFormat('rocket-league', 5))).toBe('2v2 · 1 ronda · 5 partidos');
  });
});
