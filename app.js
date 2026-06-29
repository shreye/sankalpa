// ── State ────────────────────────────────────────────────
let bwOn = false;
let pcSelected = [];
let lastOutput = '';

// ── Arc segments ─────────────────────────────────────────
const ARC_SEGS = [
  { key: 'centering',  label: 'Centering',  color: '#2A9D8F' },
  { key: 'pranayama',  label: 'Pranayama',  color: '#7B5EA7', bwOnly: true },
  { key: 'warmup',     label: 'Warm-up',    color: '#E9A84C' },
  { key: 'peak',       label: 'Peak',       color: '#D95F43' },
  { key: 'cooldown',   label: 'Cool-down',  color: '#48A999' },
  { key: 'savasana',   label: 'Savasana',   color: '#5B8DB8' },
  { key: 'meditation', label: 'Meditation', color: '#4A3780', bwOnly: true },
];

// ── Helpers ───────────────────────────────────────────────
function getDur() {
  return parseInt(document.querySelector('[data-g="dur"].on')?.dataset.v || 15);
}
function getSav() {
  return parseInt(document.getElementById('sav').value);
}

// ── Arc ───────────────────────────────────────────────────
function calcArc() {
  const total = getDur(), sav = getSav();
  const pran = bwOn ? Math.round(total * 0.12) : 0;
  const med  = bwOn ? Math.round(total * 0.08) : 0;
  const rem  = Math.max(1, total - sav - pran - med);
  const ctr  = Math.max(1, Math.round(rem * 0.06));
  const wu   = Math.round(rem * 0.25);
  const cd   = Math.round(rem * 0.25);
  const pk   = Math.max(1, rem - ctr - wu - cd);
  return { centering: ctr, pranayama: pran, warmup: wu, peak: pk, cooldown: cd, savasana: sav, meditation: med };
}

function renderArc() {
  const mins = calcArc(), total = getDur();
  const bar = document.getElementById('arc-bar');
  const legend = document.getElementById('arc-legend');
  bar.innerHTML = ''; legend.innerHTML = '';

  ARC_SEGS.filter(s => !s.bwOnly || (bwOn && mins[s.key] > 0)).forEach(s => {
    const m = mins[s.key];
    const pct = (m / total) * 100;
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.width = pct + '%';
    seg.style.background = s.color;
    const tip = document.createElement('div');
    tip.className = 'seg-tip';
    tip.textContent = s.label + ' · ~' + m + ' min';
    seg.appendChild(tip);
    bar.appendChild(seg);

    const li = document.createElement('div');
    li.className = 'leg-item';
    li.innerHTML = `<div class="leg-dot" style="background:${s.color}"></div>${s.label}`;
    legend.appendChild(li);
  });
}

// ── Chip interactions ─────────────────────────────────────
function sel(el) {
  const g = el.dataset.g;
  document.querySelectorAll(`[data-g="${g}"]`).forEach(c => c.classList.remove('on'));
  if (!el.classList.contains('off')) el.classList.add('on');
  if (g === 'dur') {
    const d = parseInt(el.dataset.v);
    const mins = Math.round(d * 0.2);
    document.getElementById('bw-badge').textContent = mins + ' min';
    const warn = document.getElementById('bw-warn');
    warn.style.display = (bwOn && mins < 5) ? '' : 'none';
    warn.textContent = `Only ${mins} min available at ${d} min — consider 30 min+ for meaningful breathwork.`;
    renderArc();
  }
}

function multi(el) {
  if (!el.classList.contains('off')) el.classList.toggle('on');
}

function multiProps(el) {
  const isNo = el.dataset.noprops !== undefined;
  if (isNo) {
    document.querySelectorAll('[data-g="props"]').forEach(c => c.classList.remove('on', 'suggest'));
    el.classList.add('on');
  } else {
    document.querySelector('[data-noprops]')?.classList.remove('on');
    el.classList.toggle('on');
    el.classList.remove('suggest');
  }
}

// ── Breathwork toggle ─────────────────────────────────────
function toggleBW() {
  bwOn = !bwOn;
  document.getElementById('bw-pill').classList.toggle('on', bwOn);
  const d = getDur(), mins = Math.round(d * 0.2);
  const badge = document.getElementById('bw-badge');
  badge.style.display = bwOn ? '' : 'none';
  badge.textContent = mins + ' min';
  const warn = document.getElementById('bw-warn');
  warn.style.display = (bwOn && mins < 5) ? '' : 'none';
  warn.textContent = `Only ${mins} min available at ${d} min — consider 30 min+ for meaningful breathwork.`;
  renderArc();
}

// ── Multi-select dropdown ─────────────────────────────────
function toggleDD() {
  const dd = document.getElementById('ms-dd');
  const tr = document.getElementById('ms-trigger');
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open', !isOpen);
  tr.classList.toggle('open', !isOpen);
  if (!isOpen) setTimeout(() => document.addEventListener('click', outsideClick, { once: true }), 0);
}

function outsideClick(e) {
  const wrap = document.getElementById('ms-trigger').closest('.sec');
  if (!wrap.contains(e.target)) {
    document.getElementById('ms-dd').classList.remove('open');
    document.getElementById('ms-trigger').classList.remove('open');
  } else {
    setTimeout(() => document.addEventListener('click', outsideClick, { once: true }), 0);
  }
}

function togglePC(el) {
  const val = el.dataset.val;
  const isPreg = el.dataset.preg !== undefined;
  if (el.classList.contains('sel')) {
    el.classList.remove('sel');
    el.querySelector('.ms-check').textContent = '';
    pcSelected = pcSelected.filter(v => v !== val);
  } else {
    if (isPreg) {
      document.querySelectorAll('[data-preg]').forEach(p => {
        p.classList.remove('sel');
        p.querySelector('.ms-check').textContent = '';
      });
      pcSelected = pcSelected.filter(v => !v.startsWith('Pregnancy'));
    }
    el.classList.add('sel');
    el.querySelector('.ms-check').textContent = '✓';
    pcSelected.push(val);
  }
  renderTags();
  applyRules();
}

function renderTags() {
  const tags = document.getElementById('ms-tags');
  const cnt = document.getElementById('pc-count');
  if (!pcSelected.length) {
    tags.innerHTML = '<span class="ms-placeholder">Select any adaptations needed…</span>';
    cnt.style.display = 'none';
  } else {
    tags.innerHTML = pcSelected.map(v =>
      `<span class="ms-tag">${v}<span onclick="removePC('${v}',event)">×</span></span>`
    ).join('');
    cnt.textContent = pcSelected.length + ' selected';
    cnt.style.display = '';
  }
}

function removePC(val, e) {
  e.stopPropagation();
  pcSelected = pcSelected.filter(v => v !== val);
  document.querySelectorAll('.ms-opt').forEach(o => {
    if (o.dataset.val === val) { o.classList.remove('sel'); o.querySelector('.ms-check').textContent = ''; }
  });
  renderTags();
  applyRules();
}

// ── Smart rules ───────────────────────────────────────────
function applyRules() {
  const style   = document.querySelector('[data-g="style"].on')?.dataset.v;
  const flow    = document.querySelector('[data-g="flow"].on')?.dataset.v;
  const energy  = document.querySelector('[data-g="energy"].on')?.dataset.v;
  const isRestorative = style === 'Restorative';
  const isSlow        = flow === 'Slow';
  const isMandala     = flow === 'Mandala';
  const isPeak        = flow === 'PeakPose';
  const isDynamic     = energy === 'Dynamic';
  const isMeditative  = energy === 'Meditative';
  const isPreg        = pcSelected.some(v => v.startsWith('Pregnancy'));
  const hasHighBP     = pcSelected.includes('High blood pressure');

  const highChip = document.querySelector('[data-g="int"][data-v="High"]');
  const medChip  = document.querySelector('[data-g="int"][data-v="Medium"]');
  const lowChip  = document.querySelector('[data-g="int"][data-v="Low"]');
  const begChip  = document.querySelector('[data-g="level"][data-v="Beginner"]');
  const dynChip  = document.querySelector('[data-g="energy"][data-v="Dynamic"]');
  const intWarn  = document.getElementById('int-warn');
  const flowWarn = document.getElementById('flow-warn');

  const disableHigh   = isRestorative || isSlow || isMeditative || isPreg || hasHighBP;
  const disableLow    = isMandala || isDynamic;
  const disableBeg    = isMandala || isPeak || isDynamic;
  const disableDynamic = isPreg;

  highChip.classList.toggle('off', disableHigh);
  lowChip.classList.toggle('off', disableLow);
  begChip.classList.toggle('off', disableBeg);
  dynChip.classList.toggle('off', disableDynamic);

  let adjusted = false;
  if (disableHigh && highChip.classList.contains('on')) { highChip.classList.remove('on'); medChip.classList.add('on'); adjusted = true; }
  if (disableLow  && lowChip.classList.contains('on'))  { lowChip.classList.remove('on');  medChip.classList.add('on'); adjusted = true; }
  intWarn.style.display = adjusted ? '' : 'none';

  if (disableBeg && begChip.classList.contains('on')) {
    begChip.classList.remove('on');
    document.querySelector('[data-g="level"][data-v="Intermediate"]').classList.add('on');
  }
  if (disableDynamic && dynChip.classList.contains('on')) {
    dynChip.classList.remove('on');
    document.querySelector('[data-g="energy"][data-v="Flowing"]').classList.add('on');
  }

  document.querySelectorAll('[data-adv]').forEach(c => {
    const off = isRestorative || isPreg;
    c.classList.toggle('off', off);
    if (off && c.classList.contains('on')) {
      c.classList.remove('on');
      document.querySelector('[data-g="flow"][data-v="Ladder"]').classList.add('on');
    }
  });

  flowWarn.style.display = (isRestorative || isPreg) ? '' : 'none';

  document.querySelectorAll('[data-strength]').forEach(c => {
    c.classList.toggle('off', isRestorative);
    if (isRestorative) c.classList.remove('on');
  });

  const bolster = document.querySelector('[data-bolster]');
  if (isRestorative) {
    if (!bolster.classList.contains('on')) bolster.classList.add('suggest');
  } else {
    bolster.classList.remove('suggest');
  }
}

// ── Build prompt — compact format to minimise input tokens ──
function buildPrompt(pdf = false) {
  const dur      = getDur();
  const name     = document.getElementById('fname').value.trim() || 'Untitled flow';
  const level    = document.querySelector('[data-g="level"].on')?.dataset.v || 'Beginner';
  const intensity= document.querySelector('[data-g="int"].on')?.dataset.v || 'Medium';
  const style    = document.querySelector('[data-g="style"].on')?.dataset.v || 'Vinyasa';
  const flow     = document.querySelector('[data-g="flow"].on')?.dataset.v || 'Ladder';
  const energy   = document.querySelector('[data-g="energy"].on')?.dataset.v || 'Flowing';
  const theme    = document.getElementById('theme').value;
  const sav      = getSav();
  const focuses  = [...document.querySelectorAll('[data-g="focus"].on')].map(e => e.querySelector('.cl').textContent);
  const props    = [...document.querySelectorAll('[data-g="props"].on, [data-g="props"].suggest')].map(e => e.querySelector('.cl').textContent);

  // Build compact key-value prompt — ~40% fewer tokens than prose sentences
  const lines = [
    `Flow: "${name}" | ${dur}min | ${style} | ${flow} | ${energy} | ${level} | ${intensity}`,
    `Focus: ${focuses.length ? focuses.join(', ') : 'full body'}`,
    `Savasana: ${sav}min | Props: ${props.length ? props.join(', ') : 'none'}`,
  ];

  if (bwOn) {
    const pran = Math.round(dur * 0.12);
    const med  = Math.round(dur * 0.08);
    lines.push(`Breathwork: pranayama ${pran}min after centering, meditation ${med}min after savasana`);
  }

  if (theme)        lines.push(`Theme: ${theme}`);
  if (pcSelected.length) lines.push(`Considerations: ${pcSelected.join(', ')}`);
  if (pdf)          lines.push('PDF: print-ready format, footer each page: Created by @groundingwithshera');

  return lines.join('\n');
}

// ── API call — passes duration for server-side model routing ──
async function callAPI(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration: getDur() })
  });
  if (!res.ok) throw new Error('API error ' + res.status);
  const data = await res.json();
  return data.content;
}

// ── Phase colour map ──────────────────────────────────────
const PHASE_COLORS = {
  'CENTERING':  '#2A9D8F',
  'PRANAYAMA':  '#7B5EA7',
  'WARM':       '#E9A84C',
  'PEAK':       '#D95F43',
  'COOL':       '#48A999',
  'SAVASANA':   '#5B8DB8',
  'MEDITATION': '#4A3780',
};

function getPhaseColor(name) {
  const up = name.toUpperCase();
  for (const [k, v] of Object.entries(PHASE_COLORS)) {
    if (up.includes(k)) return v;
  }
  return '#888780';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderFlow(raw) {
  const lines = raw.split('\n');
  let html = '';
  let inPhase = false;

  const rTitle   = /^#\s+(.+)$/;
  const rPhase   = /^#{1,3}\s*(CENTERING|PRANAYAMA|WARM[\s\-]?UP|PEAK|COOL[\s\-]?DOWN|SAVASANA|MEDITATION)(.*)$/i;
  const rRound   = /^(Round\s+\d+)\s*[:\-–]?\s*(.*)$/i;
  const rRepeat  = /^-\s+(.+?)\s*[—–]\s*as before/i;
  const rNewPose = /^[★\*]\s+\*{0,2}([^*—–]+)\*{0,2}\s*(?:\[([^\]]+)\])?\s*[—–]\s*(.+)$/;
  const rPose    = /^(\d+)\.\s+\*{0,2}([^*—–]+?)\*{0,2}\s*(?:\[([^\]]+)\])?\s*[—–]\s*(.+)$/;
  const rHold    = /\((\d[\d.]*\s*(?:breaths?|min|sec|seconds?)(?:[^)]*)?)\)\s*$/i;
  const rIntent  = /^\*(.+)\*$|^["""](.+)["""]\s*$/;
  const rVinyasa = /^(\d+)\.\s+\*{0,2}(Vinyasa)\*{0,2}\s*[—–]\s*(.+)$/i;

  function closePhase() { if (inPhase) { html += '</div>'; inPhase = false; } }

  function openPhase(name, extra) {
    closePhase();
    const color = getPhaseColor(name);
    html += `<div style="margin-bottom:20px">`;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border)">`;
    html += `<div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>`;
    html += `<span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-secondary)">${escHtml(name.toUpperCase())}</span>`;
    if (extra && extra.trim()) html += `<span style="font-size:11px;color:var(--text-muted);margin-left:auto">${escHtml(extra.trim())}</span>`;
    html += `</div>`;
    inPhase = true;
  }

  function poseRow(num, name, counter, cue, isNew) {
    const holdMatch = cue.match(rHold);
    const hold = holdMatch ? holdMatch[1] : '';
    if (hold) cue = cue.replace(holdMatch[0], '').trim();
    cue = cue.replace(/\.$/, '').trim();
    const bg = isNew
      ? 'background:#f0fdf4;border-left:2px solid #bbf7d0;padding:8px 10px;border-radius:6px;margin:2px 0'
      : 'padding:8px 0;border-bottom:1px solid var(--border)';
    html += `<div style="display:flex;align-items:flex-start;gap:10px;${bg}">`;
    html += `<span style="font-size:11px;color:var(--text-muted);min-width:20px;padding-top:2px;flex-shrink:0">${escHtml(String(num))}</span>`;
    html += `<div style="flex:1">`;
    html += `<div style="font-size:13px;font-weight:500;color:var(--text)">${escHtml(name.trim())}`;
    if (isNew) html += ` <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#16a34a;color:#fff;vertical-align:middle">★ new</span>`;
    if (counter) html += ` <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;vertical-align:middle">${escHtml(counter)}</span>`;
    html += `</div>`;
    if (cue) html += `<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;line-height:1.6">${escHtml(cue)}</div>`;
    html += `</div>`;
    if (hold) html += `<span style="font-size:11px;color:var(--text-muted);white-space:nowrap;padding-top:2px;font-style:italic;flex-shrink:0">${escHtml(hold)}</span>`;
    html += `</div>`;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === '---' || line === '—') continue;

    // Title
    const mTitle = line.match(rTitle);
    if (mTitle) { closePhase(); html += `<h1 style="font-size:19px;font-weight:600;margin-bottom:4px;color:var(--text)">${escHtml(mTitle[1])}</h1>`; continue; }

    // Phase header
    const mPhase = line.match(rPhase);
    if (mPhase) { openPhase(mPhase[1], mPhase[2].replace(/[()]/g,'').trim()); continue; }

    // Subtitle (plain text before first phase)
    if (!inPhase && !line.startsWith('#') && !line.match(rIntent)) {
      html += `<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${escHtml(line)}</p>`; continue;
    }

    // Intention / italic
    const mIntent = line.match(rIntent);
    if (mIntent) {
      const txt = escHtml(mIntent[1] || mIntent[2] || '');
      html += `<blockquote style="border-left:2px solid #bfdbfe;padding:.65rem 1rem;background:#eff6ff;border-radius:0 8px 8px 0;color:#374151;font-style:italic;margin:10px 0 14px;font-size:13px;line-height:1.6">${txt}</blockquote>`; continue;
    }

    // Round header
    const mRound = line.match(rRound);
    if (mRound) {
      html += `<div style="display:flex;align-items:center;gap:8px;margin:12px 0 6px">`;
      html += `<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">${escHtml(mRound[1])}</span>`;
      if (mRound[2]) html += `<span style="font-size:11px;color:var(--text-muted);font-style:italic">${escHtml(mRound[2])}</span>`;
      html += `</div>`; continue;
    }

    // Repeated pose
    const mRepeat = line.match(rRepeat);
    if (mRepeat) { html += `<div style="padding:5px 10px;opacity:.5;font-size:12px;font-style:italic;color:var(--text-secondary)">${escHtml(mRepeat[1])} — as before</div>`; continue; }

    // Vinyasa (subtle)
    const mVinyasa = line.match(rVinyasa);
    if (mVinyasa) {
      html += `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">`;
      html += `<span style="font-size:11px;color:var(--text-muted);min-width:20px">${mVinyasa[1]}</span>`;
      html += `<span style="font-size:12px;color:var(--text-muted);font-style:italic">${escHtml(mVinyasa[2])} — ${escHtml(mVinyasa[3])}</span></div>`; continue;
    }

    // New pose ★
    const mNew = line.match(rNewPose);
    if (mNew) { poseRow('★', mNew[1], mNew[2], mNew[3], true); continue; }

    // Standard numbered pose
    const mPose = line.match(rPose);
    if (mPose) { poseRow(mPose[1], mPose[2], mPose[3], mPose[4], false); continue; }

    // Branding footer
    if (/created by/i.test(line)) {
      closePhase();
      html += `<div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:20px;padding-top:12px;border-top:1px solid var(--border)">${escHtml(line)}</div>`; continue;
    }

    // Anything else in a phase
    if (inPhase && line.length > 2) {
      html += `<p style="font-size:12px;color:var(--text-muted);margin:4px 0;font-style:italic">${escHtml(line)}</p>`;
    }
  }

  closePhase();
  return html;
}


// ── Generate flow ─────────────────────────────────────────
async function generate() {
  const prompt = buildPrompt();
  await runGeneration(prompt);
}

// ── PDF — no second API call, just print what's on screen ─
function generatePDF() {
  if (!lastOutput) {
    alert('Generate a flow first, then download as PDF.');
    return;
  }
  window.print();
}

async function runGeneration(prompt) {
  document.getElementById('output-wrap').style.display = '';
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('output-content').innerHTML = '';
  document.getElementById('output-actions').style.display = 'none';
  document.getElementById('gen-btn').disabled = true;
  document.getElementById('pdf-btn').disabled = true;
  document.getElementById('output-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const content = await callAPI(prompt);
    lastOutput = content;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('output-content').innerHTML = renderFlow(content);
    document.getElementById('output-actions').style.display = 'flex';
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('output-content').innerHTML =
      '<p style="color:#dc2626">Something went wrong — please try again.</p>';
  } finally {
    document.getElementById('gen-btn').disabled = false;
    document.getElementById('pdf-btn').disabled = false;
  }
}

// ── Output actions ────────────────────────────────────────
function copyFlow() {
  navigator.clipboard.writeText(lastOutput).then(() => {
    const btn = document.querySelector('.output-btn');
    btn.innerHTML = '<i class="ti ti-check"></i> Copied';
    setTimeout(() => btn.innerHTML = '<i class="ti ti-copy"></i> Copy', 2000);
  });
}

function printFlow() { window.print(); }

function resetOutput() {
  document.getElementById('output-wrap').style.display = 'none';
  document.getElementById('output-content').innerHTML = '';
  lastOutput = '';
}

// ── Init ──────────────────────────────────────────────────
renderArc();
