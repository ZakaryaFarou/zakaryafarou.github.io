/* research-animation.js — v17
   Animated research showcase — zakaryafarou.github.io
   Vanilla Canvas 2D. Zero external dependencies. Loops automatically.
   Respects prefers-reduced-motion.

   Narrative arc:
     Scene 0  (0–5 s)    Real-world records → structured table → feature scatter
     Scene 1  (4.5–11.5) Full imbalanced dataset
     Scene 2  (11.2–18.5) Decision boundary fails on minority class
     Scene 3  (18.2–25.5) Resampling — synthetic samples + improved boundary
     Scene 4  (25.2–31.8) Research knowledge network
     Scene 5  (31.5–38)   Academic identity
*/
(function () {
  'use strict';

  var canvas = document.getElementById('research-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Palette ─────────────────────────────────────────────────────────────── */
  var C = {
    bg:   '#111318',
    maj:  '#5c6880',                       /* majority class — cool grey  */
    min:  '#7b8fe8',                       /* minority class — site accent */
    syn:  'rgba(123,143,232,0.58)',        /* synthetic samples            */
    bBad: 'rgba(220,222,232,0.35)',        /* bad decision boundary        */
    bGd:  'rgba(123,143,232,0.75)',        /* improved decision boundary   */
    mut:  '#8a94a8',
    brt:  '#eef0f5',
    acc:  '#7b8fe8',
    edg:  'rgba(123,143,232,0.25)',        /* network edges                */
    nFl:  '#1c2035',                       /* network node fill            */
    nSt:  '#7b8fe8',                       /* network node stroke          */
    err:  'rgba(210,75,75,0.80)',          /* misclassification markers    */
    ax:   'rgba(138,148,168,0.42)',        /* axis lines                   */
    grid: 'rgba(138,148,168,0.09)',        /* subtle grid                  */
  };

  /* ── Responsive canvas sizing ───────────────────────────────────────────── */
  var W, H;
  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = Math.floor(r.width);
    H = canvas.height = Math.floor(Math.min(480, Math.max(320, r.width * 0.42)));
  }
  resize();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(canvas.parentElement);
  }

  /* ── Seeded deterministic RNG ───────────────────────────────────────────── */
  var _s = 1337;
  function rng() { _s ^= _s << 13; _s ^= _s >> 17; _s ^= _s << 5; return (_s >>> 0) / 0x100000000; }
  function rr(a, b) { return a + rng() * (b - a); }
  function cl(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ── Stable dot clouds (relative 0–1 coords) ────────────────────────────── */
  _s = 1337;
  var MAJ = [], MIN_D = [], SYN = [];

  /* Majority: two clusters + scattered noise (255 points) */
  for (var i = 0; i < 255; i++) {
    var x, y;
    if (i < 88)       { x = rr(0.46, 0.90); y = rr(0.06, 0.44); }   /* top-right    */
    else if (i < 172) { x = rr(0.30, 0.84); y = rr(0.52, 0.90); }   /* bottom-right */
    else              { x = rr(0.06, 0.92); y = rr(0.06, 0.92); }   /* scattered    */
    MAJ.push({ x: cl(x,0.04,0.96), y: cl(y,0.04,0.96), r: 2+rng()*1.8, ph: rng()*6.28 });
  }
  /* Minority: tight cluster, lower-left (28 points) */
  for (var j = 0; j < 28; j++) {
    MIN_D.push({ x: cl(rr(0.08,0.26),0.04,0.96), y: cl(rr(0.55,0.80),0.04,0.96), r: 2+rng()*1.8, ph: rng()*6.28 });
  }
  /* Synthetic (generated during scene 3) */
  for (var k = 0; k < 22; k++) {
    SYN.push({ x: cl(rr(0.06,0.30),0.04,0.96), y: cl(rr(0.50,0.84),0.04,0.96), r: 2+rng()*1.6, born: 0.08+rng()*0.55 });
  }

  /* ── Scene 0: illustrative fraud records (NOT real research data) ─────── */
  var S0_TX = [
    { amt: '$4,200', freq: '3/mo',  age: '8 yr',    cls: 0 },
    { amt: '$890',   freq: '2/mo',  age: '12 yr',   cls: 0 },
    { amt: '$2,100', freq: '1/mo',  age: '5 yr',    cls: 0 },
    { amt: '$560',   freq: '4/mo',  age: '3 yr',    cls: 0 },
    { amt: '$1,340', freq: '2/mo',  age: '7 yr',    cls: 0 },
    { amt: '$320',   freq: '3/mo',  age: '9 yr',    cls: 0 },
    { amt: '$128',   freq: '14/mo', age: '0.5 yr',  cls: 1 },   /* suspicious */
    { amt: '$34',    freq: '28/mo', age: '0.3 yr',  cls: 1 },   /* suspicious */
  ];

  /* Scatter plot area (relative to canvas) — leaves room for axis labels */
  var S0_PL = 0.17, S0_PR = 0.83, S0_PT = 0.17, S0_PB = 0.76;

  /* Feature values extracted from S0_TX (used to derive scatter positions) */
  var AGE_VALS  = [8,   12,  5,   3,   7,   9,   0.5, 0.3];
  var FREQ_VALS = [3,    2,  1,   4,   2,   3,  14,  28 ];
  var AGE_MIN = 0.3, AGE_MAX = 12, FREQ_MIN = 1, FREQ_MAX = 28;

  /* Scatter targets: DERIVED from actual feature values.
     x = account age   (older → right)
     y = tx frequency  (higher frequency → top, i.e., inverted) */
  var S0_TARGETS = S0_TX.map(function(tx, ii) {
    var xr = (AGE_VALS[ii]  - AGE_MIN)  / (AGE_MAX  - AGE_MIN);
    var yr = (FREQ_VALS[ii] - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
    return {
      x:   S0_PL + xr * (S0_PR - S0_PL),
      y:   S0_PB - yr * (S0_PB - S0_PT),  /* inverted: high freq → lower y coord */
      cls: tx.cls
    };
  });

  /* ── Research knowledge network (Scene 4) ───────────────────────────────── */
  var NODES = [
    {x:0.50,y:0.38,l:'data'},
    {x:0.26,y:0.22,l:'imbalance'},
    {x:0.74,y:0.22,l:'synthetic'},
    {x:0.14,y:0.50,l:'anomaly'},
    {x:0.86,y:0.50,l:'evaluation'},
    {x:0.34,y:0.68,l:'sampling'},
    {x:0.66,y:0.68,l:'generative'},
    {x:0.50,y:0.14,l:'reliability'},
    {x:0.14,y:0.32,l:'cluster'},
    {x:0.86,y:0.32,l:'robustness'},
  ];
  var EDGES = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
    [1,5],[1,3],[1,8],[2,6],[2,5],[3,8],[4,9],
    [5,6],[7,4],[7,2],[7,9],[3,4],
  ];

  /* ── Captions ───────────────────────────────────────────────────────────── */
  var CAPS = [
    {t:0.6,  fi:0.5, h:3.8, fo:0.8, txt:'From real-world records to data we can learn from.'},
    {t:6.5,  fi:0.5, h:5.0, fo:0.8, txt:'Real-world data is rarely balanced.'},
    {t:13.5, fi:0.5, h:5.0, fo:0.8, txt:'Class imbalance can mislead a classifier.'},
    {t:20.5, fi:0.5, h:5.0, fo:0.8, txt:'Resampling gives the minority class a fair chance.'},
    {t:27.5, fi:0.5, h:4.5, fo:0.8, txt:'Data-centric thinking. Broader, reliable systems.'},
  ];

  /* ── Math helpers ───────────────────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eio(t) { t = cl(t, 0, 1); return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function c01(v) { return cl(v, 0, 1); }
  /* Fade envelope: ramp-in fi s, hold h s, ramp-out fo s, starting at st */
  function fade(t, st, fi, h, fo) {
    var dt = t - st;
    if (dt < 0)         return 0;
    if (dt < fi)        return eio(dt / fi);
    if (dt < fi + h)    return 1;
    if (dt < fi + h + fo) return 1 - eio((dt - fi - h) / fo);
    return 0;
  }
  function sp(t, a, b) { return c01((t - a) / (b - a)); }   /* scene progress 0→1 */
  function px(x) { return x * W; }
  function py(y) { return y * H; }

  /* ── Primitive draw helpers ─────────────────────────────────────────────── */
  function dot(x, y, r, col, al) {
    if (al <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.beginPath();
    ctx.arc(px(x), py(y), r, 0, 6.2832);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }

  /* Monospace label */
  function mono(txt, cx, cy, fs, col, al, align, base, bold) {
    if (al <= 0.01) return;
    ctx.save();
    ctx.globalAlpha  = al;
    ctx.fillStyle    = col;
    ctx.font         = (bold ? '600 ' : '400 ') + Math.round(fs) + 'px \'DM Mono\',monospace';
    ctx.textAlign    = align || 'center';
    ctx.textBaseline = base  || 'middle';
    ctx.fillText(txt, cx, cy);
    ctx.restore();
  }

  /* ── Scene 0: records → table → feature scatter ─────────────────────────── */
  function drawScene0(t, al) {
    if (al <= 0.01) return;

    var p  = sp(t, 0, 5);
    var p1 = c01(p / 0.30);               /* cards    0–1.5 s of scene */
    var p2 = c01((p - 0.30) / 0.30);     /* table    1.5–3 s          */
    var p3 = c01((p - 0.60) / 0.40);     /* scatter  3–5 s            */

    var cardsA = al * (1 - eio(c01(p2 * 1.8)));
    var tableA = al * eio(p2) * (1 - eio(c01(p3 * 1.8)));
    var dotA   = al * eio(p3);

    var colW  = Math.min(W * 0.62, 460);
    var cLeft = (W - colW) * 0.5;
    /* Table center x in relative coords — always ≈ 0.50 by symmetry */
    var tblCX = (cLeft + colW * 0.5) / W;

    /* ── Phase 1: Transaction chip cards ──────────────────────────────────── */
    if (cardsA > 0.01) {
      var chipW = colW * 0.43;
      var chipH = Math.min(H * 0.115, 46);
      var gX    = colW * 0.14;
      var gY    = Math.min(H * 0.048, 20);
      var sY    = (H - (4 * chipH + 3 * gY)) * 0.40;

      S0_TX.forEach(function(tx, ii) {
        var appear = c01((p1 - ii * 0.09) * 4) * cardsA;
        if (appear <= 0.01) return;
        var col = ii % 2, row = Math.floor(ii / 2);
        var bx  = cLeft + col * (chipW + gX);
        var by  = sY + row * (chipH + gY) + (1 - eio(appear)) * 14;

        ctx.save();
        ctx.globalAlpha = appear;
        ctx.strokeStyle = tx.cls ? C.min : 'rgba(92,104,128,0.38)';
        ctx.fillStyle   = tx.cls ? 'rgba(123,143,232,0.09)' : 'rgba(92,104,128,0.05)';
        ctx.lineWidth   = 1;
        /* Rounded rectangle */
        var r6 = 6;
        ctx.beginPath();
        ctx.moveTo(bx + r6, by);
        ctx.lineTo(bx + chipW - r6, by);
        ctx.arcTo(bx + chipW, by, bx + chipW, by + r6, r6);
        ctx.lineTo(bx + chipW, by + chipH - r6);
        ctx.arcTo(bx + chipW, by + chipH, bx + chipW - r6, by + chipH, r6);
        ctx.lineTo(bx + r6, by + chipH);
        ctx.arcTo(bx, by + chipH, bx, by + chipH - r6, r6);
        ctx.lineTo(bx, by + r6);
        ctx.arcTo(bx, by, bx + r6, by, r6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        var fSz = Math.max(9, W * 0.012);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.font         = '600 ' + Math.round(fSz) + 'px \'DM Mono\',monospace';
        ctx.fillStyle    = tx.cls ? C.min : C.brt;
        ctx.fillText(tx.amt, bx + 9, by + chipH * 0.35);
        ctx.font         = '400 ' + Math.round(fSz * 0.82) + 'px \'DM Mono\',monospace';
        ctx.fillStyle    = C.mut;
        ctx.fillText(tx.freq + '  ·  ' + tx.age, bx + 9, by + chipH * 0.68);
        ctx.restore();
      });

      /* Subtle "Illustrative data" note */
      var nFs = Math.max(7, W * 0.0082);
      ctx.save();
      ctx.globalAlpha  = cardsA * 0.45;
      ctx.font         = 'italic ' + Math.round(nFs) + 'px Manrope,system-ui,sans-serif';
      ctx.fillStyle    = C.mut;
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Illustrative data — not real research records', px(0.96), py(0.94));
      ctx.restore();
    }

    /* ── Phase 2: Structured data table ────────────────────────────────────── */
    if (tableA > 0.01) {
      var tTop  = H * 0.16;
      var tRowH = Math.min(H * 0.068, 27);
      var cW0   = colW * 0.28;  /* Amount       */
      var cW1   = colW * 0.23;  /* Freq         */
      var cW2   = colW * 0.22;  /* Account age  */
      /* Class column: rest */
      var hFs   = Math.max(8, W * 0.0095);
      var rFs   = Math.max(8, W * 0.0100);

      /* Header row */
      ctx.save();
      ctx.globalAlpha  = c01(eio(p2) * 2) * tableA;
      ctx.font         = '700 ' + Math.round(hFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.acc;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Amount',      cLeft,                       tTop);
      ctx.fillText('Freq',        cLeft + cW0,                 tTop);
      ctx.fillText('Acct age',    cLeft + cW0 + cW1,           tTop);
      ctx.fillText('Class',       cLeft + cW0 + cW1 + cW2,     tTop);
      /* Header underline */
      ctx.strokeStyle = 'rgba(123,143,232,0.28)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(cLeft - 2,           tTop + 5);
      ctx.lineTo(cLeft + colW,        tTop + 5);
      ctx.stroke();
      ctx.restore();

      /* Data rows */
      S0_TX.forEach(function(tx, ri) {
        var rowA = c01((eio(p2) - ri * 0.065) * 5) * tableA;
        if (rowA <= 0.01) return;
        var ry  = tTop + (ri + 1) * tRowH;

        ctx.save();
        ctx.globalAlpha  = rowA;
        ctx.font         = '400 ' + Math.round(rFs) + 'px \'DM Mono\',monospace';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle    = tx.cls ? C.min : C.mut;
        ctx.fillText(tx.amt,  cLeft,                  ry);
        ctx.fillText(tx.freq, cLeft + cW0,             ry);
        ctx.fillText(tx.age,  cLeft + cW0 + cW1,       ry);

        /* Class: dot + text */
        var dotXpx = cLeft + cW0 + cW1 + cW2 + 6;
        ctx.beginPath();
        ctx.arc(dotXpx, ry - 4, 3.5, 0, 6.2832);
        ctx.fillStyle = tx.cls ? C.min : C.maj;
        ctx.fill();
        if (W > 480) {
          var cFs = Math.max(7, W * 0.0088);
          ctx.font      = '400 ' + Math.round(cFs) + 'px \'DM Mono\',monospace';
          ctx.fillStyle = tx.cls ? C.min : C.mut;
          ctx.textAlign = 'left';
          ctx.fillText(tx.cls ? 'suspicious' : 'normal', dotXpx + 10, ry);
        }
        ctx.restore();
      });
    }

    /* ── Phase 3: Feature scatter plot with axis labels ─────────────────── */
    if (dotA > 0.01) {
      var axFs   = Math.max(8, W * 0.0095);
      var tickFs = Math.max(7, W * 0.0082);
      var pxL = px(S0_PL), pxR = px(S0_PR);
      var pyT = py(S0_PT), pyB = py(S0_PB);

      ctx.save();
      ctx.globalAlpha = dotA;

      /* Subtle grid lines */
      ctx.strokeStyle = C.grid;
      ctx.lineWidth   = 1;
      var ng = 3;
      for (var gi = 1; gi <= ng; gi++) {
        var gx = pxL + gi * (pxR - pxL) / (ng + 1);
        ctx.beginPath(); ctx.moveTo(gx, pyT); ctx.lineTo(gx, pyB); ctx.stroke();
      }
      for (var gj = 1; gj <= ng; gj++) {
        var gy = pyT + gj * (pyB - pyT) / (ng + 1);
        ctx.beginPath(); ctx.moveTo(pxL, gy); ctx.lineTo(pxR, gy); ctx.stroke();
      }

      /* Axis lines */
      ctx.strokeStyle = C.ax;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(pxL, pyT); ctx.lineTo(pxL, pyB);  /* y axis */
      ctx.moveTo(pxL, pyB); ctx.lineTo(pxR, pyB);  /* x axis */
      ctx.stroke();

      /* X axis ticks */
      var xTicks = [0.3, 4, 8, 12];
      xTicks.forEach(function(v) {
        var tx2 = pxL + (v - AGE_MIN) / (AGE_MAX - AGE_MIN) * (pxR - pxL);
        ctx.strokeStyle = C.ax; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx2, pyB); ctx.lineTo(tx2, pyB + 4); ctx.stroke();
        if (W > 420) {
          ctx.font         = Math.round(tickFs) + 'px \'DM Mono\',monospace';
          ctx.fillStyle    = C.mut;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(v < 1 ? v : Math.round(v), tx2, pyB + 7);
        }
      });

      /* Y axis ticks */
      var yTicks = [1, 7, 14, 28];
      yTicks.forEach(function(v) {
        var ty2 = pyB - (v - FREQ_MIN) / (FREQ_MAX - FREQ_MIN) * (pyB - pyT);
        ctx.strokeStyle = C.ax; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pxL, ty2); ctx.lineTo(pxL - 4, ty2); ctx.stroke();
        if (W > 420) {
          ctx.font         = Math.round(tickFs) + 'px \'DM Mono\',monospace';
          ctx.fillStyle    = C.mut;
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(v, pxL - 7, ty2);
        }
      });

      /* X axis title */
      ctx.font         = Math.round(axFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.mut;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Account age (yr)  →', (pxL + pxR) / 2, pyB + (W > 420 ? 22 : 10));

      /* Y axis title (rotated) */
      ctx.save();
      ctx.translate(pxL - (W > 420 ? 34 : 20), (pyT + pyB) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font         = Math.round(axFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.mut;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('↑  Tx freq (/mo)', 0, 0);
      ctx.restore();

      /* Color legend */
      var legY  = pyT + 8;
      var legX  = pxR - (W > 560 ? 155 : 100);
      var legFS = Math.max(7, W * 0.009);
      ctx.font      = Math.round(legFS) + 'px \'DM Mono\',monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

      ctx.beginPath(); ctx.arc(legX, legY + 10, 4, 0, 6.2832); ctx.fillStyle = C.maj; ctx.fill();
      ctx.fillStyle = C.mut;
      ctx.fillText(W > 480 ? 'Normal (6)' : 'Normal', legX + 11, legY + 10);

      ctx.beginPath(); ctx.arc(legX, legY + 26, 4, 0, 6.2832); ctx.fillStyle = C.min; ctx.fill();
      ctx.fillStyle = C.min;
      ctx.fillText(W > 480 ? 'Suspicious (2)' : 'Suspicious', legX + 11, legY + 26);

      /* Illustrative note */
      var nFs2 = Math.max(7, W * 0.0080);
      ctx.font         = 'italic ' + Math.round(nFs2) + 'px Manrope,system-ui,sans-serif';
      ctx.fillStyle    = 'rgba(138,148,168,0.38)';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Illustrative', pxL + 2, pyT);

      ctx.restore();

      /* Dots — fly from table-row position to feature-derived scatter position */
      var tRowH2 = Math.min(H * 0.068, 27);
      S0_TARGETS.forEach(function(tg, ii) {
        /* Staggered: dot ii starts its flight at p3 = ii * 0.065 */
        var tp  = c01((p3 - ii * 0.065) * 4);
        var tpE = eio(tp);
        /* Source: approximate table row centre */
        var srcX = tblCX;
        var srcY = 0.16 + (ii + 1) * tRowH2 / H;
        var ex = lerp(srcX, tg.x, tpE);
        var ey = lerp(srcY, tg.y, tpE);
        dot(ex, ey, 3.5, tg.cls ? C.min : C.maj, dotA * c01(tp * 4));
      });
    }
  }

  /* ── Decision boundary ──────────────────────────────────────────────────── */
  /* bad (progress=0): diagonal line that misses minority cluster
     good (progress→1): tighter line wrapping closer to minority  */
  function drawBnd(progress, good, al) {
    if (al <= 0.01) return;
    var pe = good ? eio(progress) : 0;
    var x1 = lerp(0.10, 0.03, pe), y1 = lerp(0.08, 0.36, pe);
    var x2 = lerp(0.58, 0.33, pe), y2 = lerp(0.98, 1.00, pe);
    ctx.save();
    ctx.globalAlpha = al;
    ctx.lineWidth   = 1.5;
    ctx.strokeStyle = good ? C.bGd : C.bBad;
    ctx.setLineDash(good ? [] : [7, 5]);
    ctx.beginPath();
    ctx.moveTo(px(x1), py(y1));
    ctx.lineTo(px(x2), py(y2));
    ctx.stroke();
    ctx.setLineDash([]);

    /* Boundary label — appears once visible, hides during improvement motion */
    var showBadLabel  = !good  && al > 0.35;
    var showGoodLabel =  good  && al > 0.35 && progress > 0.50;
    if (showBadLabel || showGoodLabel) {
      var bFs  = Math.max(8, W * 0.0088);
      var lx   = good ? px(0.37) : px(0.42);
      var ly   = good ? py(0.56) : py(0.46);
      ctx.globalAlpha  = al * 0.80;
      ctx.font         = Math.round(bFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = good ? C.bGd : C.bBad;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(good ? 'Improved boundary' : 'Decision boundary', lx, ly);
    }
    ctx.restore();
  }

  /* ── Misclassification markers (all 28 minority dots) ────────────────────── */
  function drawErrors(al) {
    if (al <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.strokeStyle = C.err;
    ctx.lineWidth   = 1.5;
    MIN_D.forEach(function(d) {
      var s = 5, ex = px(d.x), ey = py(d.y);
      ctx.beginPath();
      ctx.moveTo(ex-s,ey-s); ctx.lineTo(ex+s,ey+s);
      ctx.moveTo(ex+s,ey-s); ctx.lineTo(ex-s,ey+s);
      ctx.stroke();
    });
    /* "← misclassified" annotation just right of minority cluster */
    if (al > 0.45) {
      var eFs = Math.max(8, W * 0.0090);
      ctx.globalAlpha  = al * 0.85;
      ctx.font         = Math.round(eFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.err;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('← minority misclassified', px(0.27), py(0.67));
    }
    ctx.restore();
  }

  /* ── Dot field (scenes 1–3) ─────────────────────────────────────────────── */
  function drawDots(t, al, withSyn, prog3) {
    var tick = t * 0.9;
    MAJ.forEach(function(d) {
      var w = Math.sin(tick + d.ph) * 0.004;
      dot(d.x+w, d.y+w*0.5, d.r, C.maj, al * 0.72);
    });
    MIN_D.forEach(function(d) {
      var w = Math.sin(tick*1.3 + d.ph) * 0.003;
      dot(d.x+w, d.y+w*0.5, d.r, C.min, al);
    });
    if (withSyn) {
      SYN.forEach(function(d) {
        var sa = c01((prog3 - d.born) / 0.14);
        if (sa <= 0.01) return;
        if (sa < 0.9) {
          ctx.save();
          ctx.globalAlpha = (1-sa) * 0.45 * al;
          ctx.beginPath();
          ctx.arc(px(d.x), py(d.y), d.r + (1-sa)*13, 0, 6.2832);
          ctx.strokeStyle = C.min;
          ctx.lineWidth   = 1;
          ctx.stroke();
          ctx.restore();
        }
        dot(d.x, d.y, d.r * eio(sa), C.syn, sa * al * 0.85);
      });
    }
  }

  /* ── Cluster annotation labels (scene 1) ────────────────────────────────── */
  function drawClusterLabels(al) {
    if (al <= 0.01) return;
    var fs = Math.max(8, W * 0.0092);
    mono('Majority  n=255', px(0.70), py(0.07), fs, C.mut, al * 0.82, 'center', 'middle', false);
    mono('Minority  n=28',  px(0.17), py(0.50), fs, C.min, al * 0.92, 'center', 'middle', false);
  }

  /* ── Semantic knowledge network (scene 4) ───────────────────────────────── */
  function drawNet(al, appear) {
    if (al <= 0.01) return;
    var nr = Math.max(5, W * 0.019);
    var fs = Math.max(8, W * 0.0105);
    /* Edges */
    ctx.save();
    ctx.globalAlpha = appear * al * 0.7;
    ctx.strokeStyle = C.edg;
    ctx.lineWidth   = 1;
    EDGES.forEach(function(e) {
      ctx.beginPath();
      ctx.moveTo(px(NODES[e[0]].x), py(NODES[e[0]].y));
      ctx.lineTo(px(NODES[e[1]].x), py(NODES[e[1]].y));
      ctx.stroke();
    });
    ctx.restore();
    /* Nodes + labels */
    NODES.forEach(function(n, ii) {
      var na = c01((appear - ii*0.045) * 3) * al;
      if (na <= 0.01) return;
      var isCenter = n.l === 'data';
      ctx.save();
      ctx.globalAlpha = na;
      ctx.beginPath();
      ctx.arc(px(n.x), py(n.y), nr, 0, 6.2832);
      ctx.fillStyle   = C.nFl; ctx.fill();
      ctx.strokeStyle = isCenter ? C.acc : C.nSt;
      ctx.lineWidth   = isCenter ? 2 : 1.5;
      ctx.stroke();
      ctx.font         = (isCenter ? 'bold ' : '') + Math.round(fs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = isCenter ? C.acc : C.mut;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.l, px(n.x), py(n.y) + nr + 4);
      ctx.restore();
    });
  }

  /* ── Captions ───────────────────────────────────────────────────────────── */
  function drawCaption(t) {
    var fs = Math.max(12, W * 0.013);
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font         = '500 ' + Math.round(fs) + 'px Manrope,system-ui,sans-serif';
    CAPS.forEach(function(c) {
      var a = fade(t, c.t, c.fi, c.h, c.fo);
      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      ctx.fillStyle   = C.mut;
      ctx.fillText(c.txt, W/2, H - 18);
    });
    ctx.restore();
  }

  /* ── Identity card (scene 5) ─────────────────────────────────────────────── */
  function drawId(t, al) {
    if (al <= 0.01) return;
    var prog = sp(t, 32, 38);
    var cY   = H * 0.40;
    var ns   = Math.max(20, W * 0.036);
    var ss   = Math.max(12, W * 0.015);
    var ts   = Math.max(10, W * 0.012);
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';

    function idLine(idx, text, font, col, yOff) {
      var a = c01((prog - idx * 0.12) * 5) * al;
      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      ctx.font        = font;
      ctx.fillStyle   = col;
      ctx.fillText(text, W/2, cY + yOff);
    }

    idLine(0, 'Zakarya Farou, PhD',
      '800 '  + Math.round(ns) + 'px Manrope,system-ui,sans-serif', C.brt, 0);
    idLine(1, 'Assistant Professor',
      '500 '  + Math.round(ss) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35);
    idLine(2, 'Eötvös Loránd University · Budapest',
      '500 '  + Math.round(ss) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35 + ss*1.65);
    idLine(3, 'Data-Centric AI  ·  Imbalanced Learning  ·  Reliable ML',
      '500 '  + Math.round(ts) + 'px \'DM Mono\',monospace', C.acc, ns*1.35 + ss*3.55);
    idLine(4, 'Explore research  ·  Publications  ·  Collaborate',
      '700 '  + Math.round(ts) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35 + ss*5.5);

    ctx.restore();
  }

  /* ── Main animation loop ────────────────────────────────────────────────── */
  var TOTAL   = 38;
  var startT  = null;
  var pending = false;

  function tick(ts) {
    if (!startT) startT = ts;
    var t = Math.min((ts - startT) / 1000, TOTAL + 0.05);

    /* Background */
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* Per-scene fade envelopes — overlapping for smooth crossfades */
    var a0 = fade(t,  0.0, 0.3, 4.0, 1.0);   /* 0.0  – 5.3 s  Scene 0 */
    var a1 = fade(t,  4.5, 0.5, 5.5, 1.0);   /* 4.5  – 11.5 s Scene 1 */
    var a2 = fade(t, 11.2, 0.8, 5.5, 1.0);   /* 11.2 – 18.5 s Scene 2 */
    var a3 = fade(t, 18.2, 0.8, 5.5, 1.0);   /* 18.2 – 25.5 s Scene 3 */
    var a4 = fade(t, 25.2, 0.8, 4.8, 1.0);   /* 25.2 – 31.8 s Scene 4 */
    var a5 = fade(t, 31.5, 0.8, 8.0, 0.0);   /* 31.5 s –     Scene 5 */

    /* Scene 0: records → structured table → feature scatter */
    if (a0 > 0.01) drawScene0(t, a0);

    /* Scene 1: full imbalanced dataset drifts in */
    if (a1 > 0.01) {
      var p1 = sp(t, 4.5, 11.5);
      var ip = c01(p1 * 1.8);
      MAJ.forEach(function(d, ii) {
        var da = c01((ip - (ii/MAJ.length)*0.5) * 5) * a1;
        var w  = Math.sin(t*0.9 + d.ph) * 0.004;
        dot(d.x+w, d.y+w*0.5, d.r, C.maj, da * 0.72);
      });
      MIN_D.forEach(function(d, ii) {
        var da = c01((ip - 0.25 - (ii/MIN_D.length)*0.35) * 6) * a1;
        var w  = Math.sin(t*1.3 + d.ph) * 0.003;
        dot(d.x+w, d.y+w*0.5, d.r, C.min, da);
      });
      /* Cluster labels appear after dots finish settling */
      drawClusterLabels(c01((p1 - 0.65) / 0.18) * a1);
    }

    /* Scene 2: decision boundary — fails on imbalanced minority */
    if (a2 > 0.01) {
      var p2 = sp(t, 12, 19);
      drawDots(t, a2, false, 0);
      drawBnd(0, false, c01(p2*6) * a2);
      drawErrors(c01((p2 - 0.45) * 4) * a2);
    }

    /* Scene 3: resampling — synthetic samples + improved boundary */
    if (a3 > 0.01) {
      var p3  = sp(t, 19, 26);
      var bp  = c01((p3 - 0.35) / 0.55);
      drawDots(t, a3, true, p3);
      drawBnd(bp, true, c01(p3*8) * a3);
      /* "+ Synthetic samples" label — appears as samples bloom */
      mono('+ Synthetic samples', px(0.175), py(0.455),
        Math.max(8, W*0.0090), C.syn, c01((p3-0.28)/0.14)*a3*0.85,
        'center', 'middle', false);
    }

    /* Scene 4: research knowledge network */
    if (a4 > 0.01) {
      var p4   = sp(t, 26, 33);
      var diss = c01(p4 * 4);
      MAJ.slice(0, 55).forEach(function(d) {
        dot(d.x, d.y, d.r, C.maj, (1-diss) * a4 * 0.4);
      });
      drawNet(a4, c01((p4 - 0.12) * 2.0));
    }

    /* Scene 5: academic identity */
    if (a5 > 0.01) drawId(t, a5);

    drawCaption(t);

    /* Loop */
    if (t < TOTAL) {
      requestAnimationFrame(tick);
    } else if (!pending) {
      pending = true;
      setTimeout(function() {
        startT  = null;
        pending = false;
        requestAnimationFrame(tick);
      }, 2800);
    }
  }

  /* ── Static render for prefers-reduced-motion ─────────────────────────── */
  function drawStatic() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    MAJ.slice(0, 80).forEach(function(d) { dot(d.x, d.y, d.r, C.maj, 0.22); });
    MIN_D.forEach(function(d)             { dot(d.x, d.y, d.r, C.min, 0.40); });
    drawId(38, 1);
  }

  /* ── Init ─────────────────────────────────────────────────────────────── */
  document.fonts.ready.then(function() {
    if (reduced) { drawStatic(); }
    else         { requestAnimationFrame(tick); }
  });

})();
