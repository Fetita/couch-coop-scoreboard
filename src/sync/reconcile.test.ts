import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile';

describe('sincronización', () => {
  const remote = { json: '{"a":1}' };
  it('el que anota sube si la nube está vacía o tiene cambios pendientes', () => {
    expect(reconcile('editor', null, '{}', false)).toBe('push');
    expect(reconcile('editor', remote, '{}', true)).toBe('push');
  });
  it('el que anota toma lo de la nube si no tiene nada pendiente', () => {
    expect(reconcile('editor', remote, '{}', false)).toBe('apply');
    expect(reconcile('editor', remote, '{"a":1}', false)).toBe('none');
  });
  it('los que miran siempre toman lo de la nube', () => {
    expect(reconcile('viewer', remote, '{}', true)).toBe('apply');
    expect(reconcile('viewer', null, '{}', false)).toBe('none');
  });
  it('sin nube no hace nada', () => {
    expect(reconcile('local', remote, '{}', true)).toBe('none');
  });
});
