import { parseLevel } from '../world.js';
import { tanta } from './tanta.js';

export const LEVEL_DEFS = [tanta];

export function buildWorlds() {
  return LEVEL_DEFS.map(parseLevel);
}
