/* =========================================================
   graph.js — v17
   - drawGraph con: grid, ejes, asíntotas, curva, puntos, notas
   - Notas numeradas con anti-colisión
   - Sin curvas extra ni tangente (eliminadas)
   ========================================================= */
(function () {
  'use strict';

  function autoRange(f, xmin, xmax, samples) {
    samples = samples || 500;
    var ys = []; var dx = (xmax - xmin) / samples;
    for (var i = 0; i <= samples; i++) {
      var y = f(xmin + i * dx);
      if (isFinite(y) && !isNaN(y) && Math.abs(y) < 1e6) ys.push(y);
    }
    if (!ys.length) return [-10, 10];
    ys.sort(function (a, b) { return a - b; });
    var p5 = ys[Math.floor(ys.length * 0.05)];
    var p95 = ys[Math.floor(ys.length * 0.95)];
    var span = p95 - p5; if (span < 1e-9) span = 2;
    var pad = span * 0.15;
    var ymin = p5 - pad, ymax = p95 + pad;
    if (ymin > 0 && ymin < span) ymin = -pad;
    if (ymax < 0 && -ymax < span) ymax = pad;
    return [ymin, ymax];
  }

  function fitCanvas(canvas) {
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    var rect = canvas.getBoundingClientRect();
    var cssW = rect.width || 320;
    var cssH = cssW * 0.65; if (cssH < 220) cssH = 220;
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: cssW, H: cssH, dpr: dpr };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function niceStep(rough) {
    if (!isFinite(rough) || rough <= 0) return 1;
    var exp = Math.floor(Math.log(rough) / Math.LN10);
    var base = Math.pow(10, exp);
    var norm = rough / base;
    var nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * base;
  }
  function short(n) {
    if (Math.abs(n) < 1e-9) return '0';
    var a = Math.abs(n);
    if (a >= 1000 || a < 0.01) return n.toExponential(1).replace('e+', 'e');
    return String(Math.round(n * 1000) / 1000);
  }

  function layoutNotes(notes, toPxX, toPxY, W, H, ctx) {
    var boxes = [];
    var boxH = 20, padX = 8, gap = 4;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var text = String(n.text || '');
      if (text.length > 34) text = text.slice(0, 34) + '…';
      var tw = ctx.measureText(text).width;
      boxes.push({
        text: text,
        w: tw + padX * 2 + 24,
        h: boxH,
        pinX: toPxX(n.x),
        pinY: toPxY(n.y),
        color: n.color || '#ffd166',
        idx: i,
        note: n,
        bx: 0, by: 0,
        placed: false
      });
    }
    // Ordenar por Y del pin (arriba primero)
    boxes.sort(function (a, b) { return a.pinY - b.pinY; });

    function overlaps(a, b) {
      return !(a.bx + a.w + gap < b.bx || b.bx + b.w + gap < a.bx ||
               a.by + a.h + gap < b.by || b.by + b.h + gap < a.by);
    }
    function fits(b) {
      return b.bx >= 4 && b.bx + b.w <= W - 4 && b.by >= 4 && b.by + b.h <= H - 4;
    }
    function collides(b, list) {
      for (var j = 0; j < list.length; j++) if (overlaps(b, list[j])) return true;
      return false;
    }

    for (var k = 0; k < boxes.length; k++) {
      var b = boxes[k];
      var offX = 14, offY = 10;
      var cands = [
        { dx:  offX,       dy: -b.h - offY },
        { dx:  offX,       dy:  offY      },
        { dx: -b.w - offX, dy: -b.h - offY },
        { dx: -b.w - offX, dy:  offY      }
      ];
      for (var c = 0; c < 4; c++) {
        b.bx = b.pinX + cands[c].dx;
        b.by = b.pinY + cands[c].dy;
        if (!fits(b)) continue;
        if (collides(b, boxes.slice(0, k))) continue;
        b.placed = true;
        break;
      }
      if (!b.placed) {
        b.bx = b.pinX + offX;
        b.by = b.pinY - b.h - offY;
        if (b.bx + b.w > W - 4) b.bx = Math.max(4, W - b.w - 4);
        if (b.by < 4) b.by = 4;
        if (b.by + b.h > H - 4) b.by = H - b.h - 4;
      }
    }
    return boxes;
  }

  function drawNotes(ctx, notes, toPxX, toPxY, W, H) {
    if (!notes || !notes.length) return;
    var boxes = layoutNotes(notes, toPxX, toPxY, W, H, ctx);

    // Pines con número
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      ctx.beginPath();
      ctx.arc(b.pinX, b.pinY, 9, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      ctx.beginPath();
      ctx.arc(b.pinX, b.pinY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = b.color; ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#0a0a1a';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(b.idx + 1), b.pinX, b.pinY + 1);
    }

    // Cajas
    for (var j = 0; j < boxes.length; j++) {
      var bx = boxes[j];
      var edgeX = (bx.bx > bx.pinX) ? bx.bx : bx.bx + bx.w;
      var edgeY = bx.by + bx.h / 2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx.pinX, bx.pinY);
      ctx.lineTo(edgeX, edgeY);
      ctx.strokeStyle = bx.color;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, bx.bx + 2, bx.by + 2, bx.w, bx.h, 8); ctx.fill();
      ctx.fillStyle = 'rgba(10,10,26,0.94)';
      roundRect(ctx, bx.bx, bx.by, bx.w, bx.h, 8); ctx.fill();
      ctx.strokeStyle = bx.color;
      ctx.lineWidth = 1.4;
      roundRect(ctx, bx.bx + 0.5, bx.by + 0.5, bx.w - 1, bx.h - 1, 8); ctx.stroke();

      ctx.fillStyle = bx.color;
      ctx.beginPath();
      ctx.arc(bx.bx + 12, bx.by + bx.h / 2, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#0a0a1a';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(bx.idx + 1), bx.bx + 12, bx.by + bx.h / 2 + 0.5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(bx.text, bx.bx + 24, bx.by + bx.h / 2 + 0.5);
    }
  }

  function drawGraph(canvas, f, opts) {
    opts = opts || {};
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, W = fit.W, H = fit.H;
    var xmin = (opts.xmin != null) ? opts.xmin : -10;
    var xmax = (opts.xmax != null) ? opts.xmax :  10;
    var yRange = (opts.ymin != null && opts.ymax != null)
      ? [opts.ymin, opts.ymax] : autoRange(f, xmin, xmax);
    var ymin = yRange[0], ymax = yRange[1];
    var color = opts.color || '#4be1ec';

    function toPxX(x) { return (x - xmin) / (xmax - xmin) * W; }
    function toPxY(y) { return H - (y - ymin) / (ymax - ymin) * H; }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, W, H);

    // Rejilla
    if (opts.showGrid !== false) {
      var gx = niceStep((xmax - xmin) / 10);
      var gy = niceStep((ymax - ymin) / 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      var x0 = Math.ceil(xmin / gx) * gx;
      for (var vx = x0; vx <= xmax; vx += gx) {
        var px = toPxX(vx);
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      }
      var y0 = Math.ceil(ymin / gy) * gy;
      for (var hy = y0; hy <= ymax; hy += gy) {
        var py = toPxY(hy);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
      }
    }

    // Ejes
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    if (ymin <= 0 && ymax >= 0) {
      var py0 = toPxY(0);
      ctx.beginPath(); ctx.moveTo(0, py0); ctx.lineTo(W, py0); ctx.stroke();
    }
    if (xmin <= 0 && xmax >= 0) {
      var px0 = toPxX(0);
      ctx.beginPath(); ctx.moveTo(px0, 0); ctx.lineTo(px0, H); ctx.stroke();
    }

    // Etiquetas
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var sx = niceStep((xmax - xmin) / 6);
    var lx0 = Math.ceil(xmin / sx) * sx;
    var axisY = (ymin <= 0 && ymax >= 0) ? toPxY(0) : H - 4;
    for (var lx = lx0; lx <= xmax; lx += sx) {
      if (Math.abs(lx) < 1e-9) continue;
      ctx.fillText(short(lx), toPxX(lx), Math.min(axisY + 3, H - 12));
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var sy = niceStep((ymax - ymin) / 5);
    var ly0 = Math.ceil(ymin / sy) * sy;
    var axisX = (xmin <= 0 && xmax >= 0) ? toPxX(0) : 4;
    for (var ly = ly0; ly <= ymax; ly += sy) {
      if (Math.abs(ly) < 1e-9) continue;
      ctx.fillText(short(ly), Math.max(axisX - 4, 24), toPxY(ly));
    }

    // Asíntotas
    if (opts.asymptotes) {
      var as = opts.asymptotes;
      ctx.save();
      ctx.setLineDash([6, 6]); ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(184, 146, 255, 0.75)';
      if (Array.isArray(as.vertical)) {
        for (var vi = 0; vi < as.vertical.length; vi++) {
          var vxv = as.vertical[vi];
          if (typeof vxv !== 'number' || !isFinite(vxv) || vxv < xmin || vxv > xmax) continue;
          var vpx = toPxX(vxv);
          ctx.beginPath(); ctx.moveTo(vpx, 0); ctx.lineTo(vpx, H); ctx.stroke();
        }
      }
      if (Array.isArray(as.horizontal)) {
        for (var hi = 0; hi < as.horizontal.length; hi++) {
          var hyv = as.horizontal[hi];
          if (typeof hyv !== 'number' || !isFinite(hyv) || hyv < ymin || hyv > ymax) continue;
          var hpy = toPxY(hyv);
          ctx.beginPath(); ctx.moveTo(0, hpy); ctx.lineTo(W, hpy); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Curva
    var samples = opts.samples || Math.max(600, Math.round(W * 1.5));
    var dx = (xmax - xmin) / samples;
    var prevPx = null, prevPy = null;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i <= samples; i++) {
      var x = xmin + i * dx;
      var y; try { y = f(x); } catch (e) { y = NaN; }
      if (!isFinite(y) || isNaN(y)) { prevPx = null; prevPy = null; continue; }
      var yClip = Math.max(ymin - (ymax - ymin), Math.min(ymax + (ymax - ymin), y));
      var px2 = toPxX(x), py2 = toPxY(yClip);
      if (prevPx !== null && Math.abs(py2 - prevPy) > H * 1.5) {
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(px2, py2);
      } else if (prevPx === null) ctx.moveTo(px2, py2);
      else ctx.lineTo(px2, py2);
      prevPx = px2; prevPy = py2;
    }
    ctx.stroke();

    // Puntos notables
    if (opts.points && opts.points.length) {
      var showLabels = (opts.pointLabels !== false);
      for (var pi = 0; pi < opts.points.length; pi++) {
        drawPoint(ctx, opts.points[pi], toPxX, toPxY, W, H, showLabels);
      }
    }

    // Notas (encima de todo)
    drawNotes(ctx, opts.notes, toPxX, toPxY, W, H);

    // Exponer layout + vista para hit-testing del drag
    canvas._afNoteBoxes = layoutNotes(opts.notes || [], toPxX, toPxY, W, H, ctx);
    canvas._afView = { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };

    return { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  }

  function drawPoint(ctx, p, toPxX, toPxY, W, H, showLabels) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
    if (!isFinite(p.x) || !isFinite(p.y)) return;
    var px = toPxX(p.x), py = toPxY(p.y);
    if (px < -30 || px > W + 30 || py < -30 || py > H + 30) return;
    var r = p.radius || 5;
    var fill = p.color || '#ffd166';
    ctx.beginPath(); ctx.arc(px, py, r + 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    if (!showLabels || !p.label) return;
    ctx.font = 'bold 10px system-ui, sans-serif';
    var tw = ctx.measureText(p.label).width;
    var th = 13, margin = 6;
    var lx = px, baseline = 'bottom', ly = py - r - margin;
    if (ly - th < 4) { ly = py + r + margin + th; baseline = 'top'; }
    var hw = tw / 2 + 4;
    if (lx - hw < 4) lx = hw + 4;
    if (lx + hw > W - 4) lx = W - hw - 4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var bgTop = (baseline === 'bottom') ? ly - th : ly;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(lx - tw/2 - 4, bgTop, tw + 8, th + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.label, lx, bgTop + th);
  }

  var API = { autoRange: autoRange, drawGraph: drawGraph, niceStep: niceStep };
  if (typeof window !== 'undefined') {
    window.drawGraph = drawGraph;
    window.autoRange = autoRange;
    window.Graph = API;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
