import { describe, expect, it } from 'vitest';
import { carSlot, racePoints, raceResult, raceState } from './tmRace';

const order = ['A', 'B', 'C'];
const race = (eliminated: string[]) => ({ id: 'r', carMode: 'x', trackId: 't', createdAt: '', order, eliminated });

describe('carrera de Trackmania por eliminación', () => {
  it('arranca con todos en carrera', () => {
    const s = raceState(race([]));
    expect(s.remaining).toEqual(order);
    expect(s.finished).toBe(false);
    expect(s.winner).toBeNull();
  });

  it('las posiciones van al revés de la eliminación', () => {
    const s = raceState(race(['B']));
    expect(s.remaining).toEqual(['A', 'C']);
    expect(s.positions.get('B')).toBe(3);
    expect(s.finished).toBe(false);
  });

  it('cuando queda uno solo, ganó', () => {
    const s = raceState(race(['B', 'A']));
    expect(s.finished).toBe(true);
    expect(s.winner).toBe('C');
    expect(Object.fromEntries(s.positions)).toEqual({ C: 1, A: 2, B: 3 });
    expect(raceResult(race(['B', 'A']))).toEqual(['C', 'A', 'B']);
  });

  it('ignora repetidos y jugadores que no corren', () => {
    const s = raceState(race(['B', 'B', 'Z']));
    expect(s.eliminated).toEqual(['B']);
  });

  it('puntos solo con la carrera terminada', () => {
    expect(racePoints(race(['A']), [3, 2, 1]).size).toBe(0);
    expect(Object.fromEntries(racePoints(race(['A', 'B']), [3, 2, 1]))).toEqual({ C: 3, B: 2, A: 1 });
  });

  it('colores fijos por lugar de salida', () => {
    expect([0, 1, 2, 3, 4].map((i) => carSlot(i).name)).toEqual(['Azul', 'Rojo', 'Verde', 'Violeta', 'Rosa']);
    expect(carSlot(5).name).toBe('Azul');
  });
});
