window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (cb) { window.setTimeout(cb, 16); };

var isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
var canvas = document.getElementById('heart');
var ctx = canvas.getContext('2d');
var koef = isMobile ? 0.6 : 1;
var width, height;

function getViewportSize() {
  var w = canvas.clientWidth || document.documentElement.clientWidth || window.innerWidth;
  var h = canvas.clientHeight || document.documentElement.clientHeight || window.innerHeight;
  return [w, h];
}

var rand = Math.random;
function getThemeColor() {
  return "hsla(350," + (~~(40 * rand() + 100)) + "%," + (~~(60 * rand() + 20)) + "%,.4)";
}

var heartPosition = function (rad) {
  return [
    Math.pow(Math.sin(rad), 3),
    -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))
  ];
};

var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
  return [dx + pos[0] * sx, dy + pos[1] * sy];
};

var traceCount = isMobile ? 18 : 32;
var pointsOrigin = [];
var dr = isMobile ? 0.08 : 0.035;

for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));
var heartPointsCount = pointsOrigin.length;

var GLYPH_STROKES = {
  'I': [[0.5, 0.05], [0.5, 0.95]],
  'L': [[0.2, 0.05], [0.2, 0.95], [0.8, 0.95]],
  'O': null,
  'V': [[0.15, 0.05], [0.5, 0.95], [0.85, 0.05]],
  'E': [[0.8, 0.05], [0.2, 0.05], [0.2, 0.5], [0.7, 0.5], [0.2, 0.5], [0.2, 0.95], [0.8, 0.95]],
  'Y': [[0.15, 0.05], [0.5, 0.5], [0.85, 0.05], [0.5, 0.5], [0.5, 0.95]],
  'U': [[0.2, 0.05], [0.2, 0.72], [0.35, 0.95], [0.65, 0.95], [0.8, 0.72], [0.8, 0.05]],
  

  'M': [[0.1, 0.95], [0.1, 0.05], [0.5, 0.5], [0.9, 0.05], [0.9, 0.95]],

'S': [[0.85, 0.1], [0.2, 0.1], [0.2, 0.5], [0.85, 0.5], [0.85, 0.9], [0.2, 0.9]],
};

function interpolatePolyline(pts, count) {
  var full = pts.slice();
  for (var i = pts.length - 2; i > 0; i--) full.push(pts[i]);

  var segLens = [];
  var totalLen = 0;
  for (var i = 0; i < full.length - 1; i++) {
    var dx = full[i + 1][0] - full[i][0];
    var dy = full[i + 1][1] - full[i][1];
    var l = Math.sqrt(dx * dx + dy * dy);
    segLens.push(l);
    totalLen += l;
  }

  var result = [];
  var step = totalLen / count;

  for (var k = 0; k < count; k++) {
    var targetDist = k * step;
    var acc = 0;
    for (var s = 0; s < segLens.length; s++) {
      if (acc + segLens[s] >= targetDist || s === segLens.length - 1) {
        var remain = targetDist - acc;
        var ratio = segLens[s] > 0 ? (remain / segLens[s]) : 0;
        var px = full[s][0] + (full[s + 1][0] - full[s][0]) * ratio;
        var py = full[s][1] + (full[s + 1][1] - full[s][1]) * ratio;
        result.push([px, py]);
        break;
      }
      acc += segLens[s];
    }
  }
  while (result.length < count) result.push(full[full.length - 1]);
  return result;
}

function generateCharPoints(ch, count, x, y, w, h) {
  var res = [];
  if (ch === 'O') {
    for (var i = 0; i < count; i++) {
      var rad = (i / count) * Math.PI * 2;
      res.push([
        x + w * 0.5 + w * 0.38 * Math.cos(rad),
        y + h * 0.5 + h * 0.45 * Math.sin(rad)
      ]);
    }
    return res;
  }

  var stroke = GLYPH_STROKES[ch] || GLYPH_STROKES['I'];
  var normPts = interpolatePolyline(stroke, count);
  for (var i = 0; i < normPts.length; i++) {
    res.push([
      x + normPts[i][0] * w,
      y + normPts[i][1] * h
    ]);
  }
  return res;
}

var currentMessage = "I MISS YOUUU";
var textOriginPoints = [];
var letterRanges = [];

function sampleTextPoints(text) {
  var clean = text.trim().toUpperCase();
  var isPortrait = height > width * 1.15;
  var words = clean.split(/\s+/);
  var lines = [];

  if (isPortrait && clean.length > 8 && words.length >= 2) {
    var mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  } else {
    lines = [clean];
  }

  var totalChars = 0;
  for (var l = 0; l < lines.length; l++) {
    for (var c = 0; c < lines[l].length; c++) {
      if (lines[l][c] !== ' ') totalChars++;
    }
  }
  if (totalChars === 0) totalChars = 1;

  var basePtsPerChar = Math.floor(heartPointsCount / totalChars);
  var allocated = 0;

  var maxLineChars = 0;
  for (var l = 0; l < lines.length; l++) maxLineChars = Math.max(maxLineChars, lines[l].length);

  var charW = Math.min((width * 0.82) / (maxLineChars * 1.15), (height * 0.42) / (lines.length * 1.5));
  var charH = charW * 1.4;
  var lineSpacing = charH * 1.35;
  var totalH = (lines.length - 1) * lineSpacing + charH;
  var startY = (height - totalH) / 2;

  var allPoints = [];
  letterRanges = [];

  for (var l = 0; l < lines.length; l++) {
    var line = lines[l];
    var lineW = line.length * (charW * 1.15) - (charW * 0.15);
    var startX = (width - lineW) / 2;
    var lineY = startY + l * lineSpacing;

    for (var c = 0; c < line.length; c++) {
      var ch = line[c];
      var charX = startX + c * (charW * 1.15);

      if (ch === ' ') continue;

      var numPts = basePtsPerChar;
      allocated += numPts;
      if (allocated + basePtsPerChar > heartPointsCount) {
        numPts += (heartPointsCount - allocated);
        allocated = heartPointsCount;
      }

      var startIdx = allPoints.length;
      var pts = generateCharPoints(ch, numPts, charX, lineY, charW, charH);
      for (var k = 0; k < pts.length; k++) allPoints.push(pts[k]);
      var endIdx = allPoints.length - 1;

      letterRanges.push({ start: startIdx, end: endIdx });
    }
  }

  while (allPoints.length < heartPointsCount) {
    allPoints.push(allPoints[allPoints.length - 1] || [width / 2, height / 2]);
  }

  return allPoints;
}

function resize() {
  var size = getViewportSize();
  width = canvas.width = koef * size[0];
  height = canvas.height = koef * size[1];
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, width, height);
  textOriginPoints = sampleTextPoints(currentMessage);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if (window.ResizeObserver) {
  new ResizeObserver(function () { resize(); }).observe(canvas);
}
resize();

function buildParticles() {
  var e = [];
  for (var i = 0; i < heartPointsCount; i++) {
    var x = rand() * width, y = rand() * height;
    e[i] = {
      vx: 0, vy: 0, speed: rand() * 1.2 + 2.8, q: ~~(rand() * heartPointsCount),
      D: 2 * (i % 2) - 1, force: 0.2 * rand() + 0.75,
      f: getThemeColor(), trace: []
    };
    for (var k = 0; k < traceCount; k++) e[i].trace[k] = { x: x, y: y };
  }
  return e;
}
var particles = buildParticles();

var petals = [];
var sparkles = [];

function spawnRosePetals(count) {
  count = count || 28;
  for (var i = 0; i < count; i++) {
    petals.push({
      x: rand() * width,
      y: -25 - rand() * (height * 0.4),
      size: rand() * 9 + 13,
      vy: rand() * 0.6 + 0.65,
      vx: (rand() - 0.5) * 0.8,
      swaySpeed: rand() * 0.018 + 0.01,
      swayOffset: rand() * Math.PI * 2,
      angle: rand() * Math.PI * 2,
      angularSpeed: (rand() - 0.5) * 0.015,
      flip: rand() * Math.PI * 2,
      flipSpeed: rand() * 0.02 + 0.012,
      life: 1.0,
      decay: rand() * 0.0018 + 0.0012,
      color: rand() > 0.4 ? '#ff1744' : '#d50032',
      darkColor: '#800020'
    });
  }
}

function spawnSparkleBurst(x, y, count) {
  count = count || 18;
  for (var i = 0; i < count; i++) {
    var angle = rand() * Math.PI * 2;
    var speed = rand() * 3 + 0.8;
    sparkles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.8,
      life: 1.0,
      decay: rand() * 0.015 + 0.01,
      size: rand() * 2.2 + 1.2,
      color: rand() > 0.5 ? '#ffd700' : '#ff4081'
    });
  }
}

function drawRosePetal(c, x, y, size, angle, flip, color, darkColor, alpha) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(Math.cos(flip), 1);
  c.globalAlpha = Math.max(0, Math.min(1, alpha));

  var grad = c.createRadialGradient(0, -size * 0.2, size * 0.1, 0, 0, size * 0.9);
  grad.addColorStop(0, '#ff6b8b');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, darkColor);

  c.fillStyle = grad;
  c.shadowColor = 'rgba(255, 23, 68, 0.4)';
  c.shadowBlur = 10;

  c.beginPath();
  c.moveTo(0, -size * 0.9);
  c.bezierCurveTo(size * 0.75, -size * 0.8, size * 0.85, size * 0.35, 0, size * 0.9);
  c.bezierCurveTo(-size * 0.85, size * 0.35, -size * 0.75, -size * 0.8, 0, -size * 0.9);
  c.fill();

  c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(0, -size * 0.7);
  c.quadraticCurveTo(size * 0.15, 0, 0, size * 0.6);
  c.stroke();

  c.restore();
}

canvas.addEventListener('pointerdown', function (e) {
  var px = e.clientX * koef;
  var py = e.clientY * koef;
  spawnSparkleBurst(px, py, 20);

  for (var i = 0; i < 4; i++) {
    petals.push({
      x: px + (rand() - 0.5) * 30,
      y: py + (rand() - 0.5) * 30,
      size: rand() * 8 + 12,
      vy: rand() * 0.8 + 0.5,
      vx: (rand() - 0.5) * 1.5,
      swaySpeed: rand() * 0.02 + 0.01,
      swayOffset: rand() * Math.PI * 2,
      angle: rand() * Math.PI * 2,
      angularSpeed: (rand() - 0.5) * 0.02,
      flip: rand() * Math.PI * 2,
      flipSpeed: rand() * 0.03 + 0.015,
      life: 1.0,
      decay: 0.002,
      color: '#ff1744',
      darkColor: '#800020'
    });
  }
});

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function getLetterRangeForIndex(idx) {
  for (var i = 0; i < letterRanges.length; i++) {
    if (idx >= letterRanges[i].start && idx <= letterRanges[i].end) {
      return letterRanges[i];
    }
  }
  return { start: 0, end: heartPointsCount - 1 };
}

var config = { traceK: 0.38, timeDelta: 0.0075 };
var time = 0;

var PHASE_HEART = 0;
var PHASE_MORPH_TO_TEXT = 1;
var PHASE_TEXT = 2;
var PHASE_MORPH_TO_HEART = 3;

var currentPhase = PHASE_HEART;
var phaseStart = Date.now();

var DUR_HEART = 7000;
var DUR_MORPH_TO_TEXT = 2200;
var DUR_TEXT = 4500;
var DUR_MORPH_TO_HEART = 2000;

var targetPoints = [];
var heartScaleX = 1, heartScaleY = 1;
var petalsSpawned = false;

function loop() {
  var now = Date.now();
  var elapsed = now - phaseStart;

  if (currentPhase === PHASE_HEART && elapsed > DUR_HEART) {
    currentPhase = PHASE_MORPH_TO_TEXT;
    phaseStart = now;
    petalsSpawned = false;
  } else if (currentPhase === PHASE_MORPH_TO_TEXT && elapsed > DUR_MORPH_TO_TEXT) {
    currentPhase = PHASE_TEXT;
    phaseStart = now;
    if (!petalsSpawned) {
      spawnRosePetals(32);
      petalsSpawned = true;
    }
  } else if (currentPhase === PHASE_TEXT && elapsed > DUR_TEXT) {
    currentPhase = PHASE_MORPH_TO_HEART;
    phaseStart = now;
  } else if (currentPhase === PHASE_MORPH_TO_HEART && elapsed > DUR_MORPH_TO_HEART) {
    currentPhase = PHASE_HEART;
    phaseStart = now;
  }

  var morphT = 0;
  if (currentPhase === PHASE_HEART) {
    morphT = 0;
  } else if (currentPhase === PHASE_MORPH_TO_TEXT) {
    morphT = easeInOutCubic(Math.min(1, (now - phaseStart) / DUR_MORPH_TO_TEXT));
  } else if (currentPhase === PHASE_TEXT) {
    morphT = 1;
  } else if (currentPhase === PHASE_MORPH_TO_HEART) {
    morphT = 1 - easeInOutCubic(Math.min(1, (now - phaseStart) / DUR_MORPH_TO_HEART));
  }

  var n = -Math.cos(time);
  heartScaleX = (1 + n) * 0.5;
  heartScaleY = (1 + n) * 0.5;
  time += ((Math.sin(time)) < 0 ? 6 : (n > 0.8) ? .2 : 0.85) * config.timeDelta;

  var textBreath = 1.0 + Math.sin(time * 1.5) * 0.025;

  for (var i = 0; i < heartPointsCount; i++) {
    var hx = heartScaleX * pointsOrigin[i][0] + width / 2;
    var hy = heartScaleY * pointsOrigin[i][1] + height / 2;

    var txPt = textOriginPoints[i] || [width / 2, height / 2];
    var tx = width / 2 + (txPt[0] - width / 2) * textBreath;
    var ty = height / 2 + (txPt[1] - height / 2) * textBreath;

    targetPoints[i] = [
      hx * (1 - morphT) + tx * morphT,
      hy * (1 - morphT) + ty * morphT
    ];
  }

  ctx.fillStyle = "rgba(0,0,0,.085)";
  ctx.fillRect(0, 0, width, height);

  for (var i = particles.length; i--;) {
    var u = particles[i];
    var q = targetPoints[u.q];
    var dx = u.trace[0].x - q[0], dy = u.trace[0].y - q[1];
    var length = Math.sqrt(dx * dx + dy * dy);

    if (10 > length) {
      if (morphT > 0.65) {
        var range = getLetterRangeForIndex(u.q);
        u.q += u.D;
        if (u.q > range.end) u.q = range.start;
        if (u.q < range.start) u.q = range.end;
      } else {
        if (0.95 < rand()) u.q = ~~(rand() * heartPointsCount);
        else {
          if (0.99 < rand()) u.D *= -1;
          u.q += u.D;
          u.q %= heartPointsCount;
          if (0 > u.q) u.q += heartPointsCount;
        }
      }
    }

    u.vx += -dx / length * u.speed;
    u.vy += -dy / length * u.speed;
    u.trace[0].x += u.vx;
    u.trace[0].y += u.vy;
    u.vx *= u.force;
    u.vy *= u.force;

    for (var k = 0; k < u.trace.length - 1;) {
      var T = u.trace[k], N = u.trace[++k];
      N.x -= config.traceK * (N.x - T.x);
      N.y -= config.traceK * (N.y - T.y);
    }

    ctx.fillStyle = u.f;
    for (var k = 0; k < u.trace.length; k++) ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
  }

  for (var i = petals.length - 1; i >= 0; i--) {
    var p = petals[i];
    p.swayOffset += p.swaySpeed;
    p.angle += p.angularSpeed;
    p.flip += p.flipSpeed;
    p.x += p.vx + Math.sin(p.swayOffset) * 0.75;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.y > height + 30 || p.life <= 0) {
      petals.splice(i, 1);
      continue;
    }

    drawRosePetal(ctx, p.x, p.y, p.size, p.angle, p.flip, p.color, p.darkColor, p.life);
  }

  for (var i = sparkles.length - 1; i >= 0; i--) {
    var s = sparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.035;
    s.life -= s.decay;

    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  window.requestAnimationFrame(loop);
}
loop();