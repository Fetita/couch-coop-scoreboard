import { describe, expect, it } from 'vitest';
import type { TrackmaniaEvent } from '../model/types';
import { digitsToMs, formatTime, msToDigits, racePoints, raceState } from './tmRace';

let n = 0;
const run = (playerId: string, timeMs: number | null, outOfFuel = false): TrackmaniaEvent => ({ id: String(n++), type: 'run', playerId, timeMs, outOfFuel });
const order = ['A', 'B', 'C'];

describe('carrera por eliminación', () => {
  it('la primera vuelta va en orden', () => {
    expect(raceState({ order, events: [] }).next).toBe('A');
    expect(raceState({ order, events: [run('A', 50000)] }).next).toBe('B');
    const s = raceState({ order, events: [run('A', 50000), run('B', 49000)] });
    expect(s.firstLap).toBe(true);
    expect(s.next).toBe('C');
  });

  it('después corre el peor tiempo', () => {
    const s = raceState({ order, events: [run('A', 50000), run('B', 49000), run('C', 51000)] });
    expect(s.firstLap).toBe(false);
    expect(s.standing).toEqual(['B', 'A', 'C']);
    expect(s.next).toBe('C');
  });

  it('si supera a alguien sigue y le toca al nuevo peor', () => {
    const s = raceState({ order, events: [run('A', 50000), run('B', 49000), run('C', 51000), run('C', 49500)] });
    expect(s.next).toBe('A');
    expect(s.eliminated).toEqual([]);
  });

  it('sin nafta y sigue último: eliminado', () => {
    const s = raceState({ order, events: [run('A', 50000), run('B', 49000), run('C', 51000), run('C', 50500, true)] });
    expect(s.eliminated).toEqual(['C']);
    expect(s.next).toBe('A');
    expect(s.positions.get('C')).toBe(3);
  });

  it('sin nafta pero superó a alguien: sigue en carrera', () => {
    const s = raceState({ order, events: [run('A', 50000), run('B', 49000), run('C', 51000), run('C', 49900, true)] });
    expect(s.eliminated).toEqual([]);
    expect(s.next).toBe('A');
  });

  it('quedarse sin nafta en la primera vuelta no elimina', () => {
    const s = raceState({ order, events: [run('A', null, true)] });
    expect(s.eliminated).toEqual([]);
  });

  it('el último en carrera gana y las posiciones van al revés de la eliminación', () => {
    const s = raceState({
      order,
      events: [run('A', 50000), run('B', 49000), run('C', 51000), run('C', 50500, true), run('A', 49800), run('A', 49700, true)],
    });
    expect(s.finished).toBe(true);
    expect(s.winner).toBe('B');
    expect(s.next).toBeNull();
    expect([...s.positions.entries()].sort()).toEqual([['A', 2], ['B', 1], ['C', 3]]);
    expect(Object.fromEntries(racePoints({ id: 'r', carMode: 'x', trackId: 't', createdAt: '', order, events: [
      run('A', 50000), run('B', 49000), run('C', 51000), run('C', 50500, true), run('A', 49800), run('A', 49700, true),
    ] }, [3, 2, 1]))).toEqual({ A: 2, B: 3, C: 1 });
  });

  it('sin tiempo va al final', () => {
    const s = raceState({ order, events: [run('A', null), run('B', 49000), run('C', 51000)] });
    expect(s.next).toBe('A');
  });

  it('eliminación manual y corrección de un intento recalculan', () => {
    const base = [run('A', 50000), run('B', 49000), run('C', 51000)];
    const s = raceState({ order, events: [...base, { id: 'x', type: 'eliminate', playerId: 'A' }] });
    expect(s.eliminated).toEqual(['A']);
    expect(s.next).toBe('C');
    // Corregir: C en realidad hizo 48 segundos.
    const fixed = [base[0], base[1], { ...base[2], timeMs: 48000 }];
    expect(raceState({ order, events: fixed }).next).toBe('A');
  });

  it('carrera sin puntos si no terminó', () => {
    expect(racePoints({ id: 'r', carMode: 'x', trackId: 't', createdAt: '', order, events: [] }, [3, 2, 1]).size).toBe(0);
  });
});

describe('tiempos', () => {
  it('formatea', () => {
    expect(formatTime(83456)).toBe('1:23.456');
    expect(formatTime(52005)).toBe('52.005');
    expect(formatTime(null)).toBe('—');
  });

  it('convierte dígitos tipeados', () => {
    expect(digitsToMs('52345')).toBe(52345);
    expect(digitsToMs('123456')).toBe(83456);
    expect(digitsToMs('5')).toBe(5);
    expect(digitsToMs('')).toBeNull();
    expect(digitsToMs('175000')).toBeNull();
    expect(digitsToMs(msToDigits(83456))).toBe(83456);
    expect(digitsToMs(msToDigits(52345))).toBe(52345);
  });
});
