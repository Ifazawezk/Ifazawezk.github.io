import { parseLevel } from '../world.js';
import { tanta } from './tanta.js';
import { alx } from './alx.js';
import { cairo } from './cairo.js';

export const LEVEL_DEFS = [tanta, alx, cairo];

export function buildWorlds() {
  return LEVEL_DEFS.map(parseLevel);
}
