import { parseLevel } from '../world.js';
import { home } from './home.js';
import { tanta } from './tanta.js';
import { alx } from './alx.js';
import { cairo } from './cairo.js';
import { hearts } from './hearts.js';
import { dunes } from './dunes.js';
import { corniche } from './corniche.js';
import { souqDef } from './souq.js';

export const LEVEL_DEFS = [home, tanta, alx, cairo, hearts, dunes, souqDef([]), corniche];
export const SOUQ_INDEX = 6;

export function buildWorlds(repos = []) {
  return LEVEL_DEFS.map((def, i) => parseLevel(i === SOUQ_INDEX ? souqDef(repos) : def));
}
