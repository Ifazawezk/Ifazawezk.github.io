import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, DRUMS, SFX, TRACK_OF_LEVEL } from '../src/audio/music.js';
import { createSession } from '../src/game/game.js';

test('every level has a tune', () => {
  for (const w of createSession().worlds) assert.ok(TRACKS[TRACK_OF_LEVEL[w.id]], w.id);
});

test('every melody stays inside its scale', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const allowed = new Set([...track.scale, ...track.scale.map((n) => n % 12)]);
    for (const n of track.lead) {
      if (n !== null) assert.ok(allowed.has(n), `${name}: ${n}`);
    }
  }
});

test('tunes are whole bars, so the loop comes back on the beat', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    assert.equal(track.lead.length % DRUMS.length, 0, name);
    assert.equal(track.bass.length % DRUMS.length, 0, name);
  }
});

test('tunes are short loops with something in them', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    const seconds = (track.lead.length * 60) / track.bpm / 2;
    assert.ok(seconds > 4 && seconds < 40, `${name}: ${seconds}s`);
    assert.ok(track.lead.filter((n) => n !== null).length > 8, name);
  }
});

test('every sound the game asks for exists', () => {
  const asked = ['jump', 'bounce', 'land', 'cup', 'stomp', 'soft', 'hurt', 'die', 'checkpoint', 'hyper', 'clear', 'grow', 'boss-hit', 'boss-throw', 'ending', 'open'];
  for (const name of asked) assert.ok(SFX[name], name);
});

test('no sound is loud enough to hurt', () => {
  for (const [name, parts] of Object.entries(SFX)) {
    for (const [, , , length, volume] of parts) {
      assert.ok(volume <= 0.3, name);
      assert.ok(length > 0 && length < 1, name);
    }
  }
});
