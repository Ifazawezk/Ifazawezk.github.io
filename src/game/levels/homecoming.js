// The last walk. The same street as the first level, the same art, at night.
// Nothing to fight and nothing to jump. It ends at the door the game started at.
export const homecoming = {
  id: 'homecoming',
  theme: 'dohanight',
  goalKind: 'villaLit',
  goalDx: -40,
  stage: 5,
  signs: ['return.sign'],
  legend: {
    K: { prop: 'karakStand' },
    c: { prop: 'ac' },
    P: { prop: 'palm' },
    C: { npc: 'cat', say: 'return.cat' },
    k: { npc: 'keeper', say: 'return.keeper' },
    Y: { npc: 'kid', say: 'return.kid', flip: true },
  },
  chunks: [
    [
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                                                  ',
      '                  k  o                     c      ',
      ' @     C       K              Y     0      c   G  ',
      '##################################################',
      '##################################################',
    ],
  ],
};
