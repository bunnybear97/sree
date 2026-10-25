(() => {
  const KEY = 'trademind.trades.v1';
  const $ = (s) => document.querySelector(s);
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let trades = [];
  try { trades = JSON.parse(localStorage.getItem(KEY)) || []; } catch { trades = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(trades)); } catch {} };

  const pnl = (t) => (t.side === 'long' ? t.exit - t.entry : t.entry - t.exit) * t.qty - t.fees;
  const sorted = () => [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  function metrics() {
    const list = sorted();
    const p = list.map(pnl);
    const wins = p.filter((x) => x > 0), losses = p.filter((x) => x < 0);
    const gross = wins.reduce((a, b) => a + b, 0), loss = -losses.reduce((a, b) => a + b, 0);
    let eq = 0, peak = 0, dd = 0;
    const curve = p.map((x) => { eq += x; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); return eq; });
    return {
      n: p.length, total: eq, curve, dd,
      winRate: p.length ? wins.length / p.length : 0,
      avgWin: wins.length ? gross / wins.length : 0,
      avgLoss: losses.length ? loss / losses.length : 0,
      pf: loss ? gross / loss : gross ? Infinity : 0,
    };
  }

  function renderStats(m) {
    const cls = m.total >= 0 ? 'up' : 'down';
    const cell = (l, v, c = '') => `<div class="stat"><span>${l}</span><b class="${c}">${v}</b></div>`;
    $('#stats').innerHTML =
      cell('Net P&L', money(m.total), cls) +
      cell('Trades', m.n) +
      cell('Win rate', (m.winRate * 100).toFixed(0) + '%') +
      cell('Profit factor', m.pf === Infinity ? '∞' : m.pf.toFixed(2)) +
      cell('Avg win / loss', `${money(m.avgWin)} / ${money(m.avgLoss)}`) +
      cell('Max drawdown', money(-m.dd), m.dd ? 'down' : '');
  }

  function renderChart(m) {
    const c = $('#chart'), empty = $('#chartEmpty');
    empty.hidden = m.n > 0;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = 260;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    if (!m.n) return;
    const css = getComputedStyle(document.documentElement);
    const pts = [0, ...m.curve];
    const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
    const pad = 28;
    const x = (i) => pad + (i / Math.max(pts.length - 1, 1)) * (w - pad * 2);
    const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
    g.strokeStyle = css.getPropertyValue('--line'); g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad, y(0)); g.lineTo(w - pad, y(0)); g.stroke();
    g.fillStyle = css.getPropertyValue('--muted'); g.font = '11px system-ui';
    g.fillText(money(max), 2, y(max) + 4); g.fillText(money(min), 2, y(min) + 4);
    g.strokeStyle = css.getPropertyValue(m.total >= 0 ? '--up' : '--down'); g.lineWidth = 2;
    g.beginPath();
    pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    g.stroke();
  }

  function renderTable() {
    const rows = sorted().reverse().map((t) => {
      const v = pnl(t);
      return `<tr><td>${esc(t.date)}</td><td>${esc(t.symbol)}</td><td>${esc(t.side)}</td><td>${esc(t.setup)}</td><td>${esc(t.mood)}</td>` +
        `<td class="${v >= 0 ? 'up' : 'down'}">${money(v)}</td><td><button class="ghost" data-del="${t.id}" aria-label="Delete trade">✕</button></td></tr>`;
    });
    $('#tradeTable tbody').innerHTML = rows.join('');
    $('#tableEmpty').hidden = rows.length > 0;
  }

  // Group trades by a key and report win rate / net P&L per group.
  function groupBy(key) {
    const g = {};
    trades.forEach((t) => { (g[t[key]] ||= []).push(pnl(t)); });
    return Object.entries(g).map(([k, v]) => ({
      k, n: v.length, net: v.reduce((a, b) => a + b, 0), wr: v.filter((x) => x > 0).length / v.length,
    }));
  }

  function insights(m) {
    const out = [];
    if (m.n < 5) return ['Log at least 5 trades to unlock pattern analysis.'];
    const moods = groupBy('mood').filter((x) => x.n >= 2).sort((a, b) => a.net - b.net);
    if (moods[0] && moods[0].net < 0) out.push(`⚠️ Your <b>${esc(moods[0].k)}</b> trades have cost you ${money(-moods[0].net)} (${(moods[0].wr * 100).toFixed(0)}% win rate). Consider sitting out when you feel this way.`);
    const best = [...moods].reverse()[0];
    if (best && best.net > 0) out.push(`✅ You trade best when <b>${esc(best.k)}</b>: ${money(best.net)} across ${best.n} trades.`);
    const setups = groupBy('setup').filter((x) => x.n >= 2).sort((a, b) => b.net - a.net);
    if (setups[0] && setups[0].net > 0) out.push(`📈 Your strongest setup is <b>${esc(setups[0].k)}</b> (${money(setups[0].net)}). Focus more size and attention here.`);
    const worst = setups[setups.length - 1];
    if (worst && worst.net < 0) out.push(`📉 <b>${esc(worst.k)}</b> setups are a drag (${money(worst.net)}). Review them or cut them.`);
    if (m.avgLoss > m.avgWin && m.winRate < 0.6) out.push(`⚠️ Average loss (${money(m.avgLoss)}) exceeds average win (${money(m.avgWin)}). Tighten stops or let winners run.`);
    if (m.dd > Math.abs(m.total) && m.dd > 0) out.push(`⚠️ Max drawdown (${money(m.dd)}) is large relative to net P&L. Check position sizing in the Risk section.`);
    const last3 = sorted().slice(-3).map(pnl);
    if (last3.length === 3 && last3.every((x) => x < 0)) out.push('🛑 Three losses in a row. A short break and a review of your plan may help.');
    if (!out.length) out.push('No major red flags. Keep logging for sharper insights.');
    return out;
  }

  function renderRisk() {
    const f = new FormData($('#riskForm'));
    const [acct, pct, entry, stop, target] = ['account', 'riskPct', 'entry', 'stop', 'target'].map((k) => parseFloat(f.get(k)));
    const el = $('#riskOut');
    const perShare = Math.abs(entry - stop);
    if (!(acct > 0 && pct > 0 && perShare > 0)) { el.innerHTML = '<p class="empty">Enter entry and stop to size your position.</p>'; return; }
    const risk = acct * pct / 100, qty = Math.floor(risk / perShare);
    const cell = (l, v) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`;
    let html = cell('Risk amount', money(risk)) + cell('Position size', qty + ' units') + cell('Position value', money(qty * entry));
    if (target > 0) {
      const rr = Math.abs(target - entry) / perShare;
      html += cell('Reward : Risk', rr.toFixed(2) + ' : 1');
    }
    el.innerHTML = html;
  }

  function renderAll() {
    const m = metrics();
    renderStats(m); renderChart(m); renderTable();
    $('#insights').innerHTML = insights(m).map((s) => `<li>${s}</li>`).join('');
    renderRisk();
  }

  $('#tradeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    trades.push({
      id: Date.now(), symbol: f.symbol.toUpperCase().trim(), side: f.side,
      entry: +f.entry, exit: +f.exit, qty: +f.qty, fees: +f.fees || 0,
      date: f.date, setup: f.setup, mood: f.mood, notes: f.notes,
    });
    save(); e.target.reset(); setToday(); renderAll();
  });
  $('#tradeTable').addEventListener('click', (e) => {
    const id = e.target.dataset.del;
    if (id) { trades = trades.filter((t) => String(t.id) !== id); save(); renderAll(); }
  });
  $('#clearBtn').addEventListener('click', () => {
    if (trades.length && confirm('Delete all trades?')) { trades = []; save(); renderAll(); }
  });
  $('#riskForm').addEventListener('input', renderRisk);
  $('#demoBtn').addEventListener('click', () => {
    if (trades.length && !confirm('Replace current trades with demo data?')) return;
    const syms = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD', 'META'], setups = ['Breakout', 'Pullback', 'Reversal', 'News'];
    const moods = ['calm', 'confident', 'fomo', 'revenge', 'anxious'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    trades = Array.from({ length: 30 }, (_, i) => {
      const mood = moods[Math.floor(rnd() * moods.length)];
      const bad = mood === 'fomo' || mood === 'revenge';
      const entry = 100 + rnd() * 100, move = (rnd() - (bad ? 0.7 : 0.4)) * 0.05 * entry;
      const d = new Date(Date.now() - (30 - i) * 864e5).toISOString().slice(0, 10);
      return {
        id: i + 1, symbol: syms[Math.floor(rnd() * syms.length)], side: 'long',
        entry: +entry.toFixed(2), exit: +(entry + move).toFixed(2), qty: 10 + Math.floor(rnd() * 40), fees: 1,
        date: d, setup: setups[Math.floor(rnd() * setups.length)], mood, notes: '',
      };
    });
    save(); renderAll();
  });

  $('#askBtn').addEventListener('click', async () => {
    const key = $('#apiKey').value.trim(), out = $('#aiOut');
    if (!key) return alert('Enter an Anthropic API key first.');
    if (trades.length < 3) return alert('Log at least 3 trades first.');
    out.hidden = false; out.textContent = 'Analyzing…';
    const summary = sorted().slice(-100).map((t) => `${t.date} ${t.symbol} ${t.side} setup=${t.setup} mood=${t.mood} pnl=${pnl(t).toFixed(2)} notes=${t.notes}`).join('\n');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json', 'x-api-key': key,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5-5', max_tokens: 800,
          system: 'You are a trading performance coach. Review the trade log: find behavioral patterns, risk-management issues, and give 3-5 concrete, actionable suggestions. Be concise. No financial advice about specific securities.',
          messages: [{ role: 'user', content: summary }],
        }),
      });
      const data = await res.json();
      out.textContent = res.ok ? data.content.map((b) => b.text || '').join('') : 'Error: ' + (data.error?.message || res.status);
    } catch (err) { out.textContent = 'Request failed: ' + err.message; }
  });

  function setToday() { $('#tradeForm [name=date]').value = new Date().toISOString().slice(0, 10); }
  setToday();
  window.addEventListener('resize', () => renderChart(metrics()));
  renderAll();
})();
