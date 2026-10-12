/* research-animation.js
   Animated research showcase for zakaryafarou.github.io
   Vanilla Canvas 2D — zero external dependencies.
   Scenes: Fraud-data intro → Imbalanced data → Bad classifier → Resampling → Semantic network → Identity.
   Loops automatically. Respects prefers-reduced-motion.
*/
(function () {
  'use strict';

  var canvas = document.getElementById('research-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Palette (dark canvas) ──────────────────────────────────────────────── */
  var C = {
    bg:   '#111318',
    maj:  '#5c6880',                      /* majority class */
    min:  '#7b8fe8',                      /* minority class — site accent */
    syn:  'rgba(123,143,232,0.52)',        /* synthetic samples */
    bBad: 'rgba(220,222,232,0.28)',        /* bad decision boundary */
    bGd:  'rgba(123,143,232,0.60)',        /* good decision boundary */
    mut:  '#8a94a8',
    brt:  '#eef0f5',
    acc:  '#7b8fe8',
    edg:  'rgba(123,143,232,0.22)',        /* network edges */
    nFl:  '#1c2035',                      /* node fill */
    nSt:  '#7b8fe8',                      /* node stroke */
    err:  'rgba(210,75,75,0.70)',          /* misclassification markers */
  };

  /* ── Responsive canvas sizing ───────────────────────────────────────────── */
  var W, H;
  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = Math.floor(r.width);
    H = canvas.height = Math.floor(Math.min(480, Math.max(300, r.width * 0.42)));
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

  /* ── Generate stable dot positions (relative 0–1) ───────────────────────── */
  _s = 1337;
  var MAJ = [], MIN_D = [], SYN = [];

  /* Majority: two loose clusters + scattered noise */
  for (var i = 0; i < 255; i++) {
    var x, y;
    if (i < 88)       { x = rr(0.46, 0.90); y = rr(0.06, 0.44); }  /* top-right */
    else if (i < 172) { x = rr(0.30, 0.84); y = rr(0.52, 0.90); }  /* bottom-center */
    else              { x = rr(0.06, 0.92); y = rr(0.06, 0.92); }  /* scattered */
    MAJ.push({ x: cl(x,0.04,0.96), y: cl(y,0.04,0.96), r: 2+rng()*1.8, ph: rng()*6.28 });
  }
  /* Minority: tight cluster, lower-left */
  for (var j = 0; j < 28; j++) {
    MIN_D.push({ x: cl(rr(0.08,0.26),0.04,0.96), y: cl(rr(0.55,0.80),0.04,0.96), r: 2+rng()*1.8, ph: rng()*6.28 });
  }
  /* Synthetic: born during scene 3, near minority */
  for (var k = 0; k < 20; k++) {
    SYN.push({ x: cl(rr(0.06,0.30),0.04,0.96), y: cl(rr(0.50,0.84),0.04,0.96), r: 2+rng()*1.6, born: 0.10+rng()*0.60 });
  }

  /* ── Scene 0: illustrative fraud-detection records (not real research data) */
  var S0_TX = [
    { amt: '$4,200', freq: '3/mo',  age: '8 yr',   cls: 0 },
    { amt: '$890',   freq: '2/mo',  age: '12 yr',  cls: 0 },
    { amt: '$2,100', freq: '1/mo',  age: '5 yr',   cls: 0 },
    { amt: '$560',   freq: '4/mo',  age: '3 yr',   cls: 0 },
    { amt: '$1,340', freq: '2/mo',  age: '7 yr',   cls: 0 },
    { amt: '$320',   freq: '3/mo',  age: '9 yr',   cls: 0 },
    { amt: '$128',   freq: '14/mo', age: '0.5 yr', cls: 1 },  /* suspicious */
    { amt: '$34',    freq: '28/mo', age: '0.3 yr', cls: 1 },  /* suspicious */
  ];
  /* Scatter targets — reuse first 6 MAJ + first 2 MIN_D positions */
  var S0_TARGETS = [];
  for (var si = 0; si < 6; si++) S0_TARGETS.push({ x: MAJ[si].x,   y: MAJ[si].y,   cls: 0 });
  for (var sj = 0; sj < 2; sj++) S0_TARGETS.push({ x: MIN_D[sj].x, y: MIN_D[sj].y, cls: 1 });

  /* ── Semantic network ───────────────────────────────────────────────────── */
  var NODES = [
    {x:0.50,y:0.40,l:'document'}, {x:0.28,y:0.26,l:'feature'},
    {x:0.72,y:0.26,l:'embedding'},{x:0.16,y:0.52,l:'token'},
    {x:0.84,y:0.52,l:'semantics'},{x:0.35,y:0.70,l:'class'},
    {x:0.65,y:0.70,l:'alignment'},{x:0.50,y:0.18,l:'benchmark'},
    {x:0.12,y:0.36,l:'label'},   {x:0.88,y:0.36,l:'evaluate'},
  ];
  var EDGES = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[1,3],[1,5],[2,4],[2,7],[3,8],[4,9],[5,6],[7,8],[7,9]];

  /* ── Captions ───────────────────────────────────────────────────────────── */
  var CAPS = [
    {t:0.5,  fi:0.4, h:3.5, fo:0.6, txt:'From real-world problems to data we can learn from.'},
    {t:6.2,  fi:0.5, h:4.5, fo:0.8, txt:'Real-world data is rarely balanced.'},
    {t:13.2, fi:0.5, h:4.5, fo:0.8, txt:'Good accuracy doesn\'t always mean good learning.'},
    {t:20.2, fi:0.5, h:4.5, fo:0.8, txt:'Better data. Better learning.'},
    {t:27.2, fi:0.5, h:3.5, fo:0.8, txt:'From structured data to intelligent systems.'},
  ];

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eio(t)  { t=cl(t,0,1); return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function c01(v)  { return cl(v, 0, 1); }
  /* Fade: ramp in over fi seconds, hold for h, ramp out over fo */
  function fade(t, st, fi, h, fo) {
    var dt = t - st;
    if (dt < 0)       return 0;
    if (dt < fi)      return eio(dt / fi);
    if (dt < fi+h)    return 1;
    if (dt < fi+h+fo) return 1 - eio((dt-fi-h) / fo);
    return 0;
  }
  /* Scene-local progress 0→1 */
  function sp(t, a, b) { return c01((t - a) / (b - a)); }
  function px(x) { return x * W; }
  function py(y) { return y * H; }

  /* ── Draw: single dot ───────────────────────────────────────────────────── */
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

  /* ── Draw: Scene 0 (real-world problem → data table → scatter) ─────────── */
  function drawScene0(t, al) {
    if (al <= 0.01) return;
    var p  = sp(t, 0, 5);
    var p1 = c01(p / 0.30);                    /* 0→1: chips  0–1.5s */
    var p2 = c01((p - 0.30) / 0.30);           /* 0→1: table  1.5–3s */
    var p3 = c01((p - 0.60) / 0.40);           /* 0→1: scatter 3–5s  */

    var cardsA = al * (1 - eio(c01(p2 * 1.5)));
    var tableA = al * eio(p2) * (1 - eio(c01(p3 * 1.5)));
    var dotA   = al * eio(p3);

    var colW  = Math.min(W * 0.62, 460);
    var cLeft = (W - colW) * 0.5;

    /* ── Phase 1: Transaction chip cards ──────────────────────────────────── */
    if (cardsA > 0.01) {
      var chipW = colW * 0.43;
      var chipH = Math.min(H * 0.115, 46);
      var gX    = colW * 0.14;
      var gY    = Math.min(H * 0.048, 20);
      var sY    = (H - (4 * chipH + 3 * gY)) * 0.40;

      S0_TX.forEach(function (tx, ii) {
        var appear = c01((p1 - ii * 0.09) * 4) * cardsA;
        if (appear <= 0.01) return;
        var col = ii % 2, row = Math.floor(ii / 2);
        var bx  = cLeft + col * (chipW + gX);
        var by  = sY + row * (chipH + gY) + (1 - eio(appear)) * 12;

        ctx.save();
        ctx.globalAlpha = appear;
        ctx.strokeStyle = tx.cls ? C.min : 'rgba(92,104,128,0.28)';
        ctx.fillStyle   = tx.cls ? 'rgba(123,143,232,0.07)' : 'rgba(92,104,128,0.04)';
        ctx.lineWidth   = 1;
        var rad = 6;
        ctx.beginPath();
        ctx.moveTo(bx + rad, by);
        ctx.lineTo(bx + chipW - rad, by);
        ctx.arcTo(bx + chipW, by, bx + chipW, by + rad, rad);
        ctx.lineTo(bx + chipW, by + chipH - rad);
        ctx.arcTo(bx + chipW, by + chipH, bx + chipW - rad, by + chipH, rad);
        ctx.lineTo(bx + rad, by + chipH);
        ctx.arcTo(bx, by + chipH, bx, by + chipH - rad, rad);
        ctx.lineTo(bx, by + rad);
        ctx.arcTo(bx, by, bx + rad, by, rad);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        var fSz = Math.max(9, W * 0.012);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.font      = '600 ' + Math.round(fSz) + 'px \'DM Mono\',monospace';
        ctx.fillStyle = tx.cls ? C.min : C.brt;
        ctx.fillText(tx.amt, bx + 9, by + chipH * 0.35);
        ctx.font      = '400 ' + Math.round(fSz * 0.82) + 'px \'DM Mono\',monospace';
        ctx.fillStyle = C.mut;
        ctx.fillText(tx.freq + '  ·  ' + tx.age, bx + 9, by + chipH * 0.68);
        ctx.restore();
      });
    }

    /* ── Phase 2: Structured data table ────────────────────────────────────── */
    if (tableA > 0.01) {
      var tW    = colW;
      var tL    = cLeft;
      var tTop  = H * 0.16;
      var tRowH = Math.min(H * 0.068, 27);
      var cW0   = tW * 0.30, cW1 = tW * 0.26, cW2 = tW * 0.22;
      var hFs   = Math.max(8, W * 0.0095);

      ctx.save();
      ctx.globalAlpha  = c01(eio(p2) * 2) * tableA;
      ctx.font         = '700 ' + Math.round(hFs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.acc;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Amount',       tL,            tTop);
      ctx.fillText('Freq',         tL + cW0,      tTop);
      ctx.fillText('Account age',  tL + cW0 + cW1, tTop);

      ctx.strokeStyle = 'rgba(123,143,232,0.22)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(tL - 2, tTop + 5);
      ctx.lineTo(tL + cW0 + cW1 + cW2 + 14, tTop + 5);
      ctx.stroke();
      ctx.restore();

      S0_TX.forEach(function (tx, ri) {
        var rowA = c01((eio(p2) - ri * 0.065) * 5) * tableA;
        if (rowA <= 0.01) return;
        var ry  = tTop + (ri + 1) * tRowH;
        var rFs = Math.max(8, W * 0.010);

        ctx.save();
        ctx.globalAlpha  = rowA;
        ctx.font         = '400 ' + Math.round(rFs) + 'px \'DM Mono\',monospace';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle    = tx.cls ? C.min : C.mut;
        ctx.fillText(tx.amt,  tL,              ry);
        ctx.fillText(tx.freq, tL + cW0,        ry);
        ctx.fillText(tx.age,  tL + cW0 + cW1,  ry);

        /* class indicator dot */
        ctx.beginPath();
        ctx.arc(tL + cW0 + cW1 + cW2 + 9, ry - 4, 3.5, 0, 6.2832);
        ctx.fillStyle = tx.cls ? C.min : C.maj;
        ctx.fill();
        ctx.restore();
      });
    }

    /* ── Phase 3: Dots settle at scatter positions ──────────────────────────── */
    if (dotA > 0.01) {
      S0_TARGETS.forEach(function (tg, ii) {
        dot(tg.x, tg.y, 2.5, S0_TX[ii].cls ? C.min : C.maj, dotA);
      });
    }
  }

  /* ── Draw: decision boundary ────────────────────────────────────────────── */
  /* bad: diagonal line that misses minority cluster
     good: tighter line that better wraps it (progress 0→1 lerps between) */
  function drawBnd(progress, good, al) {
    if (al <= 0.01) return;
    var p  = good ? eio(progress) : 0;
    var x1 = lerp(0.10, 0.03, p), y1 = lerp(0.08, 0.36, p);
    var x2 = lerp(0.58, 0.33, p), y2 = lerp(0.98, 1.00, p);
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
    ctx.restore();
  }

  /* ── Draw: misclassification markers (× on minority dots) ──────────────── */
  function drawErrors(al) {
    if (al <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.strokeStyle = C.err;
    ctx.lineWidth   = 1.5;
    for (var ii = 0; ii < 20; ii++) {
      var d = MIN_D[ii], s = 5;
      var ex = px(d.x), ey = py(d.y);
      ctx.beginPath();
      ctx.moveTo(ex-s,ey-s); ctx.lineTo(ex+s,ey+s);
      ctx.moveTo(ex+s,ey-s); ctx.lineTo(ex-s,ey+s);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Draw: dot field (scenes 2–3) ───────────────────────────────────────── */
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
        /* bloom ring */
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

  /* ── Draw: semantic network ─────────────────────────────────────────────── */
  function drawNet(al, appear) {
    if (al <= 0.01) return;
    var nr = Math.max(5, W * 0.019);
    var fs = Math.max(8, W * 0.0105);
    /* edges */
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
    /* nodes + labels */
    NODES.forEach(function(n, ii) {
      var na = c01((appear - ii*0.045) * 3) * al;
      if (na <= 0.01) return;
      ctx.save();
      ctx.globalAlpha  = na;
      ctx.beginPath();
      ctx.arc(px(n.x), py(n.y), nr, 0, 6.2832);
      ctx.fillStyle    = C.nFl; ctx.fill();
      ctx.strokeStyle  = C.nSt; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font         = 'bold ' + Math.round(fs) + 'px \'DM Mono\',monospace';
      ctx.fillStyle    = C.mut;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.l, px(n.x), py(n.y) + nr + 4);
      ctx.restore();
    });
  }

  /* ── Draw: captions ─────────────────────────────────────────────────────── */
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

  /* ── Draw: identity card (scene 5) ─────────────────────────────────────── */
  function drawId(t, al) {
    if (al <= 0.01) return;
    var prog = sp(t, 32, 38);
    var cY   = H * 0.40;
    var ns   = Math.max(20, W * 0.036);   /* name size */
    var ss   = Math.max(12, W * 0.015);   /* subtitle size */
    var ts   = Math.max(10, W * 0.012);   /* tag/link size */
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
      '800 '   + Math.round(ns) + 'px Manrope,system-ui,sans-serif', C.brt, 0);
    idLine(1, 'Assistant Lecturer & Researcher',
      '500 '   + Math.round(ss) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35);
    idLine(2, 'Eötvös Loránd University · Budapest',
      '500 '   + Math.round(ss) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35 + ss*1.65);
    idLine(3, 'Data Science  ·  Machine Learning  ·  NLP  ·  Trustworthy AI',
      '500 '   + Math.round(ts) + 'px \'DM Mono\',monospace', C.acc, ns*1.35 + ss*3.55);
    idLine(4, 'Explore research  ·  Publications  ·  Collaborate',
      '700 '   + Math.round(ts) + 'px Manrope,system-ui,sans-serif', C.mut, ns*1.35 + ss*5.5);

    ctx.restore();
  }

  /* ── Main animation loop ────────────────────────────────────────────────── */
  var TOTAL   = 38;    /* seconds for one full loop */
  var startT  = null;
  var pending = false;

  function tick(ts) {
    if (!startT) startT = ts;
    var t = Math.min((ts - startT) / 1000, TOTAL + 0.05);

    /* Background */
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* Per-scene fade alphas — overlapping for smooth crossfades */
    var a0 = fade(t,  0.0, 0.3, 4.0, 1.0);   /* 0.0  – 5.3s  Scene 0 */
    var a1 = fade(t,  4.5, 0.5, 5.5, 1.0);   /* 4.5  – 11.5s Scene 1 */
    var a2 = fade(t, 11.2, 0.8, 5.5, 1.0);   /* 11.2 – 18.5s Scene 2 */
    var a3 = fade(t, 18.2, 0.8, 5.5, 1.0);   /* 18.2 – 25.5s Scene 3 */
    var a4 = fade(t, 25.2, 0.8, 4.8, 1.0);   /* 25.2 – 31.8s Scene 4 */
    var a5 = fade(t, 31.5, 0.8, 8.0, 0.0);   /* 31.5s – ∞    Scene 5 */

    /* ── Scene 0: real-world → data table → scatter ─────────────────────── */
    if (a0 > 0.01) drawScene0(t, a0);

    /* ── Scene 1: Imbalanced data drifts in ─────────────────────────────── */
    if (a1 > 0.01) {
      var p1 = sp(t, 4.5, 11.5);
      var ip = c01(p1 * 1.8);              /* 0→1 over first ~3.9s of scene */
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
    }

    /* ── Scene 2: Bad decision boundary + misclassification ─────────────── */
    if (a2 > 0.01) {
      var p2 = sp(t, 12, 19);
      drawDots(t, a2, false, 0);
      drawBnd(0, false, c01(p2*6) * a2);
      drawErrors(c01((p2 - 0.45) * 4) * a2);
    }

    /* ── Scene 3: Synthetic samples bloom; boundary improves ─────────────── */
    if (a3 > 0.01) {
      var p3 = sp(t, 19, 26);
      var bp = c01((p3 - 0.35) / 0.55);   /* boundary improvement progress */
      drawDots(t, a3, true, p3);
      drawBnd(bp, true, c01(p3*8) * a3);
    }

    /* ── Scene 4: Semantic network ───────────────────────────────────────── */
    if (a4 > 0.01) {
      var p4   = sp(t, 26, 33);
      var diss = c01(p4 * 4);             /* dots dissolving out */
      MAJ.slice(0,55).forEach(function(d) {
        dot(d.x, d.y, d.r, C.maj, (1-diss) * a4 * 0.4);
      });
      drawNet(a4, c01((p4 - 0.12) * 2.0));
    }

    /* ── Scene 5: Identity ───────────────────────────────────────────────── */
    if (a5 > 0.01) drawId(t, a5);

    drawCaption(t);

    /* Loop control */
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

  /* ── Static render for prefers-reduced-motion ───────────────────────────── */
  function drawStatic() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    /* faint dot cloud as background texture */
    MAJ.slice(0, 80).forEach(function(d) { dot(d.x, d.y, d.r, C.maj, 0.22); });
    MIN_D.forEach(function(d)             { dot(d.x, d.y, d.r, C.min, 0.40); });
    drawId(38, 1);   /* full identity, instantly */
  }

  /* ── Init ───────────────────────────────────────────────────────────────── */
  document.fonts.ready.then(function() {
    if (reduced) { drawStatic(); }
    else         { requestAnimationFrame(tick); }
  });

})();
