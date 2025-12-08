// Vector Practice App

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    qText: $('#question-text'),
    form: $('#answer-form'),
    feedback: $('#feedback'),
    solution: $('#solution'),
    score: $('#score'),
    streak: $('#streak'),
    next: $('#next-btn'),
    submit: $('#submit-btn'),
    reveal: $('#reveal-btn'),
    // difficulty selector removed; fixed to 'medium'
    canvas: $('#graph'),
  };

  const rand = {
    int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    float(min, max, dp = 1) {
      const val = Math.random() * (max - min) + min;
      return parseFloat(val.toFixed(dp));
    },
  };

  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function fmtPoint([x, y]) { return `(${x}, ${y})`; }
  function fmtVector([a, b]) { return `⟨${a}, ${b}⟩`; }

  function difficultyRanges(diff) {
    switch (diff) {
      case 'easy': return { type: 'int', min: 0, max: 10 };
      case 'medium': return { type: 'int', min: -10, max: 10 };
      case 'hard': return { type: 'float', min: -25, max: 25 };
      default: return { type: 'int', min: -10, max: 10 };
    }
  }

  function rndNum(r) {
    if (r.type === 'int') return rand.int(r.min, r.max);
    return rand.float(r.min, r.max, 1);
  }

  function nearlyEqual(a, b, tol = 1e-2) {
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) <= tol;
  }

  function pairEqual([a, b], [c, d], tol = 1e-2) {
    return nearlyEqual(a, c, tol) && nearlyEqual(b, d, tol);
  }

  // Graph utilities for drawing axes, points, and vectors
  const Graph = (() => {
    function create(canvas) {
      const ctx = canvas.getContext('2d');
      function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const cssW = rect.width || canvas.width;
        const cssH = rect.height || canvas.height;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      let bounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
      function setBounds(b) { bounds = b; }

      function worldToScreen(pt) {
        const rect = canvas.getBoundingClientRect();
        const { xMin, xMax, yMin, yMax } = bounds;
        const x = (pt[0] - xMin) / (xMax - xMin) * rect.width;
        const y = rect.height - (pt[1] - yMin) / (yMax - yMin) * rect.height;
        return [x, y];
      }

      function screenToWorld(px, py) {
        const rect = canvas.getBoundingClientRect();
        const { xMin, xMax, yMin, yMax } = bounds;
        const x = xMin + (px / rect.width) * (xMax - xMin);
        const y = yMin + ((rect.height - py) / rect.height) * (yMax - yMin);
        return [x, y];
      }

      function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

      function pickStep(span) {
        const s = Math.max(Math.abs(span[0]), Math.abs(span[1]));
        if (s <= 10) return 1;
        if (s <= 20) return 2;
        if (s <= 50) return 5;
        return 10;
      }

      function drawGrid() {
        const rect = canvas.getBoundingClientRect();
        const { xMin, xMax, yMin, yMax } = bounds;
        const step = pickStep([xMin, xMax]);
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        for (let x = Math.ceil(xMin/step)*step; x <= xMax; x += step) {
          const [sx] = worldToScreen([x, 0]);
          ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, rect.height); ctx.stroke();
        }
        for (let y = Math.ceil(yMin/step)*step; y <= yMax; y += step) {
          const [, sy] = worldToScreen([0, y]);
          ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(rect.width, sy); ctx.stroke();
        }
        // axes
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        const [sx0] = worldToScreen([0, 0]);
        const [, sy0] = worldToScreen([0, 0]);
        ctx.beginPath(); ctx.moveTo(sx0, 0); ctx.lineTo(sx0, rect.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, sy0); ctx.lineTo(rect.width, sy0); ctx.stroke();
        ctx.restore();
      }

      function drawPoint(pt, color = '#38bdf8', label) {
        const [x, y] = worldToScreen(pt);
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        if (label) {
          ctx.fillStyle = 'rgba(229,231,235,0.9)';
          ctx.font = '12px system-ui';
          ctx.fillText(label, x + 6, y - 6);
        }
        ctx.restore();
      }

      function drawArrow(from, to, color = '#22c55e') {
        const [x1, y1] = worldToScreen(from);
        const [x2, y2] = worldToScreen(to);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const ah = 10;
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ah*(ux - 0.5*uy), y2 - ah*(uy + 0.5*ux));
        ctx.lineTo(x2 - ah*(ux + 0.5*uy), y2 - ah*(uy - 0.5*ux));
        ctx.closePath(); ctx.fillStyle = color; ctx.fill();
        ctx.restore();
      }

      function renderScene(scene) {
        clear();
        drawGrid();
        scene.forEach((item) => {
          if (item.type === 'point') drawPoint(item.p, item.color, item.label);
          if (item.type === 'arrow') drawArrow(item.from, item.to, item.color);
        });
      }

      return { setBounds, renderScene, screenToWorld };
    }
    return { create };
  })();

  // Question generators return { prompt, answer, answerShape, explain }
  const generators = {
    terminalFromInitialAndVector(r) {
      const P = [rndNum(r), rndNum(r)];
      const v = [rndNum(r), rndNum(r)];
      const Q = [Number((P[0] + v[0]).toFixed(3)), Number((P[1] + v[1]).toFixed(3))];
      return {
        kind: 'terminalFromInitialAndVector',
        prompt: `Given initial point P ${fmtPoint(P)} and vector v = ${fmtVector(v)}, find the terminal point Q = P + v.`,
        answer: Q,
        answerShape: 'pair',
        explain: `Q = P + v = (${P[0]} + ${v[0]}, ${P[1]} + ${v[1]}) = ${fmtPoint(Q)}.`,
        draw: { points: [{ p: P, label: 'P' }], arrows: [{ from: P, to: Q }] },
      };
    },
    initialFromTerminalAndVector(r) {
      const Q = [rndNum(r), rndNum(r)];
      const v = [rndNum(r), rndNum(r)];
      const P = [Number((Q[0] - v[0]).toFixed(3)), Number((Q[1] - v[1]).toFixed(3))];
      return {
        kind: 'initialFromTerminalAndVector',
        prompt: `Given terminal point Q ${fmtPoint(Q)} and vector v = ${fmtVector(v)}, find the initial point P such that Q = P + v.`,
        answer: P,
        answerShape: 'pair',
        explain: `P = Q - v = (${Q[0]} - ${v[0]}, ${Q[1]} - ${v[1]}) = ${fmtPoint(P)}.`,
        // For this type, do NOT draw the unknown P. Show Q and the vector v from the origin.
        draw: { points: [{ p: Q, label: 'Q' }], arrows: [{ from: [0,0], to: v }] },
      };
    },
  };

  const state = {
    correct: 0,
    total: 0,
    streak: 0,
    current: null,
    graph: null,
  };

  function selectedTypes() {
    // Simplified quiz: only two graph transformations.
    return [
      'terminalFromInitialAndVector',
      'initialFromTerminalAndVector',
    ];
  }

  function buildInputs(shape) {
    els.form.innerHTML = '';
    if (shape === 'pair') {
      const f1 = document.createElement('div');
      f1.className = 'field';
      f1.innerHTML = `<label for="ans-x">x-value</label><input id="ans-x" type="number" step="any" inputmode="decimal" placeholder="x" />`;
      const f2 = document.createElement('div');
      f2.className = 'field';
      f2.innerHTML = `<label for="ans-y">y-value</label><input id="ans-y" type="number" step="any" inputmode="decimal" placeholder="y" />`;
      els.form.appendChild(f1);
      els.form.appendChild(f2);
    } else if (shape === 'scalar') {
      const f = document.createElement('div');
      f.className = 'field';
      f.innerHTML = `<label for="ans-s">value</label><input id="ans-s" type="number" step="any" inputmode="decimal" placeholder="enter value" />`;
      els.form.appendChild(f);
    }
  }

  function updateScoreboard() {
    els.score.textContent = `Score: ${state.correct}/${state.total}`;
    els.streak.textContent = `Streak: ${state.streak}`;
  }

  function setFeedback(ok, msg) {
    els.feedback.className = `feedback ${ok ? 'ok' : 'no'}`;
    els.feedback.textContent = msg;
  }

  function setSolution(text) {
    els.solution.textContent = text || '';
  }

  function nextQuestion() {
    const types = selectedTypes();
    // Fixed difficulty: 'medium'
    const r = difficultyRanges('medium');
    const gen = generators[choice(types)];
    const q = gen(r);
    state.current = q;
    els.qText.textContent = q.prompt;
    buildInputs(q.answerShape);
    els.feedback.className = 'feedback';
    els.feedback.textContent = '';
    setSolution('');
    drawQuestionGraph(q);
  }

  function getUserAnswer(shape) {
    if (shape === 'pair') {
      const x = parseFloat($('#ans-x')?.value);
      const y = parseFloat($('#ans-y')?.value);
      return [x, y];
    } else if (shape === 'scalar') {
      const s = parseFloat($('#ans-s')?.value);
      return s;
    }
    return null;
  }

  function checkAnswer() {
    const q = state.current;
    if (!q) return;
    const tol = 1e-2;
    const ans = getUserAnswer(q.answerShape);
    let ok = false;
    if (q.answerShape === 'pair') {
      ok = Array.isArray(ans) && pairEqual(ans, q.answer, tol);
    } else if (q.answerShape === 'scalar') {
      ok = nearlyEqual(ans, q.answer, tol);
    }
    state.total += 1;
    if (ok) {
      state.correct += 1;
      state.streak += 1;
      setFeedback(true, 'Correct!');
    } else {
      state.streak = 0;
      setFeedback(false, 'Not quite. Try another or reveal solution.');
    }
    updateScoreboard();
  }

  function revealSolution() {
    const q = state.current;
    if (!q) return;
    setSolution(`Solution: ${q.explain}`);
  }

  // Wire up events
  els.next.addEventListener('click', nextQuestion);
  els.submit.addEventListener('click', checkAnswer);
  els.reveal.addEventListener('click', revealSolution);

  // Keyboard: Enter submits answer
  els.form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
  });

  function expandBounds(points) {
    if (!points.length) return { xMin: -12, xMax: 12, yMin: -8, yMax: 8 };
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = (maxX - minX) * 0.2 + 2;
    const padY = (maxY - minY) * 0.2 + 2;
    return {
      xMin: Math.max(-30, Math.floor(minX - padX)),
      xMax: Math.min(30, Math.ceil(maxX + padX)),
      yMin: Math.max(-30, Math.floor(minY - padY)),
      yMax: Math.min(30, Math.ceil(maxY + padY)),
    };
  }

  function drawQuestionGraph(q) {
    if (!state.graph || !q) return;
    // Static bounds: always show -10..10 on both axes
    state.graph.setBounds({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
    const scene = [];
    if (q.draw) {
      (q.draw.points || []).forEach(d => scene.push({ type: 'point', p: d.p, label: d.label, color: '#38bdf8' }));
      (q.draw.arrows || []).forEach(d => scene.push({ type: 'arrow', from: d.from, to: d.to, color: '#22c55e' }));
    }
    state.graph.renderScene(scene);
  }

  function initGraph() {
    if (!els.canvas) return;
    state.graph = Graph.create(els.canvas);
    els.canvas.addEventListener('click', (e) => {
      const rect = els.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const [xw, yw] = state.graph.screenToWorld(px, py);
      if (state.current && state.current.answerShape === 'pair') {
        const snap = (v) => Math.round(v * 2) / 2;
        const x = snap(xw), y = snap(yw);
        const xEl = document.getElementById('ans-x');
        const yEl = document.getElementById('ans-y');
        if (xEl) xEl.value = String(x);
        if (yEl) yEl.value = String(y);
      }
    });
    state.graph.setBounds({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
    state.graph.renderScene([]);
  }

  updateScoreboard();
  initGraph();
})();
