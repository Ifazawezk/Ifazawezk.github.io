// Two small bitmap fonts drawn by hand, for text that lives inside the world:
// shop signs, labels on machines, the profile animation. Translated text uses
// the page fonts in the overlay instead, so Arabic can join up properly.

const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

// 5 wide, 7 tall. Each glyph is seven rows, each row one base-32 digit.
const BIG = {
  A: 'EHHVHHH', B: 'UHHUHHU', C: 'EHGGGHE', D: 'UHHHHHU', E: 'VGGUGGV', F: 'VGGUGGG',
  G: 'EHGNHHE', H: 'HHHVHHH', I: 'E44444E', J: '72222IC', K: 'HIKOKIH', L: 'GGGGGGV',
  M: 'HRLLHHH', N: 'HPLJHHH', O: 'EHHHHHE', P: 'UHHUGGG', Q: 'EHHHLID', R: 'UHHUKIH',
  S: 'FGGE11U', T: 'V444444', U: 'HHHHHHE', V: 'HHHHHA4', W: 'HHHLLRH', X: 'HHA4AHH',
  Y: 'HHA4444', Z: 'V1248GV',
  a: '00E1FHF', b: 'GGUHHHU', c: '00EGGHE', d: '11FHHHF', e: '00EHVGE', f: '698S888',
  g: '0FHHF1E', h: 'GGMPHHH', i: '40C444E', j: '20622IC', k: 'GGIKOKI', l: 'C44444E',
  m: '00QLLHH', n: '00MPHHH', o: '00EHHHE', p: '0UHHUGG', q: '0FHHF11', r: '00MPGGG',
  s: '00FGE1U', t: '88S8896', u: '00HHHJD', v: '00HHHA4', w: '00HHLLA', x: '00HA4AH',
  y: '0HHHF1E', z: '00V248V',
  0: 'EHJLPHE', 1: '4C4444E', 2: 'EH1248V', 3: 'V24 21HE'.replace(' ', ''), 4: '26AIV22', 5: 'VGU11HE',
  6: '68GUHHE', 7: 'V124888', 8: 'EHHEHHE', 9: 'EHHF12C',
  '.': '0000004', ',': '0000048', '!': '4444404', '?': 'EH12404', ':': '0040040', ';': '0040048',
  "'": '4400000', '"': 'AA00000', '-': '000E000', _: '000000V', '+': '044V440', '=': '00V0V00',
  '/': '11248GG', '\\': 'GG84211', '(': '248884 2'.replace(' ', ''), ')': '8422248', '[': 'E88888E', ']': 'E22222E',
  '#': 'AAVAVAA', '%': 'OP248J3', '&': 'CIK8LID', '*': '04LELO0'.replace('O', '4'), '<': '248G842', '>': '8421248',
  '@': 'EHLNMGE', $: '4FKE5U4', '^': '4AH0000', '~': '008L200', '|': '4444444', '{': '6448446', '}': 'C442 44C'.replace(' ', ''),
};

// 3 wide, 5 tall, capitals only. Each glyph is five rows, each row one digit.
const TINY = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755',
  I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644',
  Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255',
  Y: '55222', Z: '71247',
  0: '75557', 1: '26227', 2: '61247', 3: '61216', 4: '55711', 5: '74616', 6: '34757', 7: '71222',
  8: '75757', 9: '75716',
  '-': '00700', _: '00007', '.': '00002', '!': '22202', '?': '61202', '+': '02720', '#': '57575',
  '/': '11244', ':': '02020', "'": '22000', '(': '12221', ')': '42224', '<': '12421', '>': '42124',
  '*': '52725', ',': '00024',
};

function rowsOf(table, ch, bits, radix) {
  const raw = table[ch];
  if (!raw) return null;
  return [...raw].map((c) => (radix === 32 ? B32.indexOf(c) : Number(c)));
}

// Trim empty columns so an i does not take up as much room as an M.
function measure(rows, bits) {
  const all = rows.reduce((a, b) => a | b, 0);
  if (!all) return { first: 0, width: 2 };
  let first = 0;
  while (!(all & (1 << (bits - 1 - first)))) first++;
  let last = bits - 1;
  while (!(all & (1 << (bits - 1 - last)))) last--;
  return { first, width: last - first + 1 };
}

function glyph(font, ch) {
  const cfg = font === 'tiny'
    ? { table: TINY, bits: 3, radix: 10, h: 5 }
    : { table: BIG, bits: 5, radix: 32, h: 7 };
  const key = font === 'tiny' ? ch.toUpperCase() : ch;
  const rows = rowsOf(cfg.table, key, cfg.bits, cfg.radix);
  if (!rows) return { rows: null, first: 0, width: font === 'tiny' ? 2 : 3, bits: cfg.bits };
  return { rows, ...measure(rows, cfg.bits), bits: cfg.bits };
}

export function textWidth(text, font = 'big', scale = 1) {
  let w = 0;
  for (const ch of String(text)) w += glyph(font, ch).width + 1;
  return Math.max(0, w - 1) * scale;
}

export function drawText(ctx, text, x, y, color, { font = 'big', scale = 1, shadow = null } = {}) {
  let penX = Math.round(x);
  const penY = Math.round(y);
  for (const ch of String(text)) {
    const g = glyph(font, ch);
    if (g.rows) {
      for (let row = 0; row < g.rows.length; row++) {
        for (let col = 0; col < g.width; col++) {
          if (g.rows[row] & (1 << (g.bits - 1 - col - g.first))) {
            const px = penX + col * scale;
            const py = penY + row * scale;
            if (shadow) {
              ctx.fillStyle = shadow;
              ctx.fillRect(px + scale, py + scale, scale, scale);
            }
            ctx.fillStyle = color;
            ctx.fillRect(px, py, scale, scale);
          }
        }
      }
    }
    penX += (g.width + 1) * scale;
  }
}
