import { parseLevel } from '../world.js';
import { tanta } from './tanta.js';
import { alx } from './alx.js';
import { cairo } from './cairo.js';
import { hearts } from './hearts.js';
import { dunes } from './dunes.js';
import { corniche } from './corniche.js';
import { souqDef } from './souq.js';

export const LEVEL_DEFS = [tanta, alx, cairo, hearts, dunes, souqDef([]), corniche];
export const SOUQ_INDEX = 5;

export function buildWorlds(repos = []) {
  return LEVEL_DEFS.map((def, i) => parseLevel(i === SOUQ_INDEX ? souqDef(repos) : def));
}
