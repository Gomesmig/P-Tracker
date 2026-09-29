'use strict';

/* ---------- Dados ---------- */
const KEY = 'proteina.v1';
const $ = (s) => document.querySelector(s);
const state = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.products && d.log) return { goal: 180, goalKcal: null, goalCarbs: null, ...d };
  } catch (e) {}
  return { goal: 180, goalKcal: null, goalCarbs: null, products: {}, log: {} };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('Não foi possível guardar. O armazenamento está cheio?'); }
}

const dayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftKey = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };
const optNum = (v) => { const n = num(v); return isFinite(n) ? n : null; };
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('pt-PT');
const toField = (v) => (v === '' || v == null ? '' : String(v).replace('.', ','));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Alimentos sem código de barras ----------
   Valores médios por 100 g: [id, nome, proteína, kcal, hidratos, peso de 1 unidade].
   Hidratos sem fibra, como nos rótulos europeus.
   "cru" = pesar antes de cozinhar; "cozinhado" = pesar já no prato. */
const GENERIC = [
  ['g-frango-cru', 'Peito de frango (cru)', 23, 110, 0, null],
  ['g-frango-coz', 'Peito de frango (cozinhado)', 31, 165, 0, null],
  ['g-coxa-coz', 'Coxa de frango sem pele (cozinhada)', 26, 190, 0, null],
  ['g-peru-cru', 'Peito de peru (cru)', 22, 105, 0, null],
  ['g-peru-coz', 'Peito de peru (cozinhado)', 29, 150, 0, null],
  ['g-vitela-cru', 'Vitela magra (crua)', 21, 110, 0, null],
  ['g-vitela-coz', 'Vitela magra (cozinhada)', 29, 170, 0, null],
  ['g-vaca-cru', 'Bife de vaca magro (cru)', 22, 125, 0, null],
  ['g-vaca-coz', 'Bife de vaca magro (grelhado)', 29, 180, 0, null],
  ['g-picada-cru', 'Carne picada de vaca (crua)', 20, 175, 0, null],
  ['g-picada-coz', 'Carne picada de vaca (cozinhada)', 26, 230, 0, null],
  ['g-porco-cru', 'Lombo de porco (cru)', 21, 130, 0, null],
  ['g-porco-coz', 'Lombo de porco (cozinhado)', 29, 190, 0, null],
  ['g-atum-nat', 'Atum em lata ao natural (escorrido)', 25, 110, 0, 56],
  ['g-atum-oleo', 'Atum em lata em óleo (escorrido)', 26, 190, 0, 56],
  ['g-atum-fresco', 'Atum fresco (grelhado)', 29, 150, 0, null],
  ['g-salmao-cru', 'Salmão (cru)', 20, 200, 0, null],
  ['g-salmao-coz', 'Salmão (grelhado)', 25, 225, 0, null],
  ['g-pescada', 'Pescada (cozida)', 20, 95, 0, null],
  ['g-bacalhau', 'Bacalhau demolhado (cozido)', 23, 105, 0, null],
  ['g-dourada', 'Dourada ou robalo (grelhado)', 25, 140, 0, null],
  ['g-camarao', 'Camarão (cozido)', 24, 100, 0, null],
  ['g-polvo', 'Polvo (cozido)', 30, 165, 4, null],
  ['g-ovo', 'Ovo inteiro', 12.5, 145, 0.7, 50],
  ['g-claras', 'Claras de ovo', 11, 52, 0.7, 33],
  ['g-queijo-fresco', 'Queijo fresco', 11, 165, 3, null],
  ['g-requeijao', 'Requeijão', 11, 150, 3.5, null],
  ['g-leite', 'Leite', 3.3, 47, 4.8, 250],
  ['g-lentilhas', 'Lentilhas (cozidas)', 9, 116, 13, null],
  ['g-grao', 'Grão-de-bico (cozido)', 8.5, 164, 18, null],
  ['g-feijao', 'Feijão (cozido)', 8, 127, 13, null],
  ['g-tofu', 'Tofu firme', 15, 145, 2, null],
  ['g-aveia', 'Flocos de aveia', 13.5, 375, 60, 40],
  ['g-pao', 'Pão de trigo', 9, 265, 50, 50],
  ['g-arroz', 'Arroz (cozido)', 2.7, 130, 28, null],
  ['g-massa', 'Massa (cozida)', 5.5, 155, 30, null],
  ['g-batata', 'Batata (cozida)', 2, 85, 18, null],
  ['g-amendoim', 'Amendoim', 25, 590, 10, 30],
  ['g-amendoas', 'Amêndoas', 21, 600, 7, 30],
];
const SEED_VERSION = 2;
function seedGeneric() {
  if ((state.seedVersion || 0) >= SEED_VERSION) return;
  const seeded = new Set(state.seeded || []);
  for (const [id, name, p100, k100, c100, unitG] of GENERIC) {
    const p = state.products[id];
    if (p) { // completa os valores novos sem mexer no que editaste
      if (p.k100 == null) p.k100 = k100;
      if (p.c100 == null) p.c100 = c100;
    } else if (!seeded.has(id)) {
      state.products[id] = { id, name, brand: '', p100, k100, c100, unitG, code: null, generic: true, updated: Date.now() };
    }
    seeded.add(id);
  }
  state.seeded = [...seeded]; state.seedVersion = SEED_VERSION;
  save();
}
seedGeneric();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- Refeições ---------- */
const MEALS = [['pa', 'Pequeno-almoço'], ['al', 'Almoço'], ['la', 'Lanche'], ['ja', 'Jantar']];
const mealName = (id) => (MEALS.find((m) => m[0] === id) || MEALS[3])[1];
function mealFor(t) {
  const h = new Date(t).getHours();
  return h < 11 ? 'pa' : h < 15 ? 'al' : h < 19 ? 'la' : 'ja';
}

/* ---------- Registos ---------- */
let viewDay = dayKey();
const isToday = () => viewDay === dayKey();
function entries(k = viewDay) { return state.log[k] || []; }
function totals(k = viewDay) {
  return entries(k).reduce((s, e) => ({ p: s.p + (e.protein || 0), k: s.k + (e.kcal || 0), c: s.c + (e.carbs || 0) }), { p: 0, k: 0, c: 0 });
}
function findByCode(code) { return Object.values(state.products).find((p) => p.code === code); }
function macros(p, g) {
  return {
    protein: (g * p.p100) / 100,
    kcal: p.k100 != null ? (g * p.k100) / 100 : null,
    carbs: p.c100 != null ? (g * p.c100) / 100 : null,
  };
}
function entryTime() {
  // num dia passado, regista à hora atual desse dia
  if (isToday()) return Date.now();
  const d = keyToDate(viewDay); const n = new Date();
  d.setHours(n.getHours(), n.getMinutes()); return d.getTime();
}
function logEntry(entry) {
  const k = viewDay;
  (state.log[k] = state.log[k] || []).push({ id: uid(), t: entryTime(), meal: entry.meal || mealFor(Date.now()), ...entry });
  if (entry.pid && state.products[entry.pid]) {
    state.products[entry.pid].uses = (state.products[entry.pid].uses || 0) + 1;
    state.products[entry.pid].lastGrams = entry.grams;
  }
  save(); render();
  toast(`+${fmt(entry.protein)} g de proteína${isToday() ? '' : ' em ' + keyToDate(k).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}`);
}
function updateEntry(id, patch) {
  const e = entries().find((x) => x.id === id); if (!e) return;
  Object.assign(e, patch); save(); render(); toast('Registo atualizado');
}

/* ---------- UI geral ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
function open(id) { const d = $(id); if (!d.open) d.showModal(); return d; }
function close(id) { const d = $(id); if (d.open) d.close(); }
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

document.querySelectorAll('nav.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(name) {
  document.querySelectorAll('nav.tabs button').forEach((b) => { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  ['hoje', 'produtos', 'historico'].forEach((t) => ($('#tab-' + t).hidden = t !== name));
  render();
  window.scrollTo(0, 0);
}

function mealChips(container, selected) {
  $(container).innerHTML = MEALS.map(([id, n]) => `<button class="chip${id === selected ? ' on' : ''}" data-meal="${id}" aria-pressed="${id === selected}">${n}</button>`).join('');
}
function chipMeal(container) { const b = $(container).querySelector('.chip.on'); return b ? b.dataset.meal : mealFor(Date.now()); }
['#a-meals', '#q-meals'].forEach((c) => $(c).addEventListener('click', (e) => {
  const b = e.target.closest('[data-meal]'); if (!b) return;
  mealChips(c, b.dataset.meal);
}));

/* ---------- Render ---------- */
function render() { renderToday(); renderProducts(); renderHistory(); }

function meterRow(label, value, goal, unit) {
  const v = Math.round(value);
  if (!goal) return `<div class="meter"><div class="mhead"><span>${label}</span><b>${v}${unit}</b></div></div>`;
  const over = v > goal;
  const txt = over ? `+${v - goal}${unit} acima` : `restam ${goal - v}${unit}`;
  return `<div class="meter${over ? ' over' : ''}"><div class="mhead"><span>${label}</span><b>${v}<small> / ${goal}${unit}</small></b></div>
    <div class="track"><div style="width:${Math.min(v / goal, 1) * 100}%"></div></div><div class="mfoot">${txt}</div></div>`;
}

function renderToday() {
  const goal = state.goal;
  const t = totals();
  const shown = Math.round(t.p);
  const scale = goal * 1.1;
  const pct = Math.min(t.p / scale, 1);
  const done = shown >= goal;

  const d = keyToDate(viewDay);
  const label = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#today-label').textContent = isToday() ? label : viewDay === shiftKey(dayKey(), -1) ? 'Ontem, ' + d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : label;
  $('#next-day').disabled = isToday();
  $('#back-today').hidden = isToday();

  $('#total').textContent = shown;
  $('#goal-label').textContent = goal;
  $('#left').textContent = done ? (shown > goal ? `Meta cumprida, +${shown - goal} g` : 'Meta cumprida') : `Faltam ${goal - shown} g`;
  $('#left').classList.toggle('done', done);
  $('#liquid').style.height = pct * 100 + '%';
  $('#beaker').classList.toggle('done', done);

  const b = $('#beaker');
  b.querySelectorAll('.tick').forEach((x) => x.remove());
  const step = goal <= 100 ? 10 : 20;
  for (let v = step; v <= goal; v += step) {
    const tk = document.createElement('div');
    const major = v % (step * 2) === 0 || v === goal;
    tk.className = 'tick' + (major ? ' major' : '') + (v === goal ? ' goal' : '');
    tk.style.bottom = (v / scale) * 100 + '%';
    if (major) tk.innerHTML = `<span>${v}</span>`;
    b.appendChild(tk);
  }

  $('#meters').innerHTML = meterRow('Calorias', t.k, state.goalKcal, ' kcal') + meterRow('Hidratos', t.c, state.goalCarbs, ' g');
  $('#set-goals').hidden = !!(state.goalKcal && state.goalCarbs);

  const favs = Object.values(state.products).filter((p) => p.uses).sort((a, b) => b.uses - a.uses).slice(0, 8);
  $('#favs-wrap').hidden = !favs.length;
  $('#favs').innerHTML = favs.map((p) => {
    const g = p.lastGrams || p.unitG || 100;
    return `<button class="chip" data-fav="${p.id}">${esc(p.name)}<b>${fmt((g * p.p100) / 100)} g</b></button>`;
  }).join('');

  const list = entries();
  $('#entries-title').textContent = isToday() ? 'O que comeste hoje' : 'O que comeste neste dia';
  if (!list.length) {
    $('#entries').innerHTML = `<p class="empty">${isToday() ? 'Ainda não registaste nada hoje. Lê o código de barras do que vais comer.' : 'Nada registado neste dia.'}</p>`;
    return;
  }
  const groups = MEALS.map(([id, n]) => [n, list.filter((e) => (e.meal || mealFor(e.t)) === id).sort((a, b) => a.t - b.t)]).filter(([, es]) => es.length);
  $('#entries').innerHTML = groups.map(([n, es]) => {
    const sp = es.reduce((s, e) => s + e.protein, 0);
    const sk = es.reduce((s, e) => s + (e.kcal || 0), 0);
    return `<div class="meal"><div class="meal-head"><span>${n}</span><span>${fmt(sp, 0)} g · ${Math.round(sk)} kcal</span></div><ul class="list">${es.map((e) => `
      <li data-entry="${e.id}"><div class="main"><div class="name">${esc(e.name)}</div>
        <div class="sub">${e.grams ? fmt(e.grams, 0) + ' g' : 'registo rápido'}${e.kcal != null ? ' · ' + Math.round(e.kcal) + ' kcal' : ''}${e.carbs != null ? ' · ' + fmt(e.carbs, 0) + ' g hid.' : ''}</div></div>
        <div class="val">${fmt(e.protein)} g</div>
        <button class="x" data-del="${e.id}" aria-label="Apagar registo">×</button></li>`).join('')}</ul></div>`;
  }).join('');
}

$('#prev-day').addEventListener('click', () => { viewDay = shiftKey(viewDay, -1); render(); });
$('#next-day').addEventListener('click', () => { if (!isToday()) { viewDay = shiftKey(viewDay, 1); render(); } });
$('#back-today').addEventListener('click', () => { viewDay = dayKey(); render(); });
$('#set-goals').addEventListener('click', openSettings);

$('#favs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  const p = state.products[b.dataset.fav];
  const g = p.lastGrams || p.unitG || 100;
  logEntry({ pid: p.id, name: p.name, grams: g, ...macros(p, g) });
});
$('#entries').addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    const k = viewDay;
    state.log[k] = (state.log[k] || []).filter((x) => x.id !== del.dataset.del);
    save(); render(); toast('Registo apagado');
    return;
  }
  const li = e.target.closest('[data-entry]'); if (!li) return;
  const en = entries().find((x) => x.id === li.dataset.entry); if (!en) return;
  if (en.pid && state.products[en.pid]) openAmount(en.pid, en);
  else openQuick(en);
});

function productRows(filter) {
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = norm((filter || '').trim()).split(/\s+/).filter(Boolean); // "frango coz" encontra "Peito de frango (cozinhado)"
  return Object.values(state.products)
    .filter((p) => { const t = norm(p.name + ' ' + (p.brand || '')); return words.every((w) => t.includes(w)); })
    .sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name, 'pt'));
}
const per100 = (p) => `${fmt(p.p100)} g prot · ${p.k100 != null ? Math.round(p.k100) + ' kcal' : 'kcal ?'} · ${p.c100 != null ? fmt(p.c100) + ' g hid' : 'hid ?'}`;
function renderProducts() {
  const rows = productRows($('#prod-search').value);
  $('#products').innerHTML = rows.length ? rows.map((p) => `
    <li data-edit="${p.id}"><div class="main"><div class="name">${esc(p.name)}</div>
    <div class="sub">${p.generic ? 'Sem código de barras' : esc(p.brand || 'Sem marca')}${p.unitG ? ' · unidade ' + fmt(p.unitG, 0) + ' g' : ''}</div>
    <div class="sub">${per100(p)} <span class="per">por 100 g</span></div></div></li>`).join('')
    : `<li class="empty">${Object.keys(state.products).length ? 'Nenhum produto encontrado.' : 'Ainda não tens produtos. Aparecem aqui quando leres o primeiro código de barras.'}</li>`;
}
$('#prod-search').addEventListener('input', renderProducts);
$('#products').addEventListener('click', (e) => { const li = e.target.closest('[data-edit]'); if (li) openProduct({ id: li.dataset.edit }); });
$('#new-product-btn').addEventListener('click', () => openProduct({}));

/* ---------- Histórico ---------- */
let histMetric = 'p';
const METRIC = {
  p: { unit: ' g', goal: () => state.goal, better: 'up' },
  k: { unit: ' kcal', goal: () => state.goalKcal, better: 'down' },
  c: { unit: ' g', goal: () => state.goalCarbs, better: 'down' },
};
$('#hist-seg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  histMetric = b.dataset.m;
  $('#hist-seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  renderHistory();
});
function renderHistory() {
  const m = METRIC[histMetric]; const goal = m.goal();
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const vals = days.map((d) => totals(dayKey(d))[histMetric]);
  const max = Math.max((goal || 0) * 1.15, ...vals, 1);
  const tk = dayKey();
  const ok = (v) => goal && (m.better === 'up' ? v >= goal : v > 0 && v <= goal);
  const bad = (v) => goal && m.better === 'down' && v > goal;
  $('#bars').innerHTML = (goal ? `<div class="goal" style="bottom:${(goal / max) * 100}%"><span>${goal}${m.unit}</span></div>` : '') +
    days.map((d, i) => `<button class="bar${ok(vals[i]) ? ' done' : ''}${bad(vals[i]) ? ' over' : ''}${dayKey(d) === tk ? ' today' : ''}" data-day="${dayKey(d)}" style="height:${(vals[i] / max) * 100}%" aria-label="${d.toLocaleDateString('pt-PT')}: ${Math.round(vals[i])}${m.unit}"></button>`).join('');
  $('#barlabels').innerHTML = days.map((d) => `<span>${d.getDate()}</span>`).join('');
  const logged = vals.filter((v, i) => entries(dayKey(days[i])).length);
  $('#avg').textContent = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) + m.unit : '–';
  $('#hit-label').textContent = m.better === 'up' ? 'Dias com meta cumprida' : 'Dias dentro da meta';
  $('#hit').textContent = goal ? vals.filter((v, i) => entries(dayKey(days[i])).length && ok(v)).length + ' / 14' : 'sem meta';
}
$('#bars').addEventListener('click', (e) => {
  const b = e.target.closest('[data-day]'); if (!b) return;
  viewDay = b.dataset.day; showTab('hoje');
});

/* ---------- Quantidade ---------- */
let amountPid = null, amountEntry = null;
function openAmount(pid, entry) {
  const p = state.products[pid]; amountPid = pid; amountEntry = entry || null;
  $('#a-name').textContent = p.name;
  const hint = /\(cru|\(crua/.test(p.name) ? ' · pesa antes de cozinhar' : /cozid|cozinhad|grelhad|escorrid/.test(p.name) ? ' · pesa já pronto' : '';
  $('#a-sub').textContent = `${p.brand ? p.brand + ' · ' : ''}${per100(p)} por 100 g${hint}`;
  const opts = [];
  const unitName = /atum em lata/i.test(p.name) ? ['1 lata', '2 latas'] : /claras/i.test(p.name) ? ['1 clara', '2 claras'] : /ovo/i.test(p.name) ? ['1 ovo', '2 ovos'] : /leite/i.test(p.name) ? ['1 copo', '2 copos'] : ['1 unidade', '2 unidades'];
  if (p.unitG) opts.push([p.unitG, unitName[0]], [p.unitG * 2, unitName[1]]);
  if (/claras/i.test(p.name) && p.unitG) opts.push([p.unitG * 3, '3 claras'], [p.unitG * 4, '4 claras']);
  else if (/ovo/i.test(p.name) && p.unitG) opts.push([p.unitG * 3, '3 ovos'], [p.unitG * 4, '4 ovos']);
  if (p.lastGrams && p.lastGrams !== p.unitG) opts.push([p.lastGrams, `Última vez (${fmt(p.lastGrams, 0)} g)`]);
  [100, 150, 200].forEach((g) => opts.push([g, g + ' g']));
  const seen = new Set();
  $('#a-quick').innerHTML = opts.filter(([g]) => !seen.has(g) && seen.add(g)).map(([g, l]) => `<button class="chip" data-g="${g}">${l}</button>`).join('');
  $('#a-grams').value = entry ? entry.grams : (p.lastGrams || p.unitG || 100);
  mealChips('#a-meals', entry ? (entry.meal || mealFor(entry.t)) : mealFor(Date.now()));
  $('#a-save').textContent = entry ? 'Guardar' : 'Registar';
  updateAmount();
  open('#dlg-amount');
}
function updateAmount() {
  const p = state.products[amountPid]; const g = num($('#a-grams').value);
  const m = macros(p, isFinite(g) ? g : 0);
  $('#a-result').textContent = fmt(m.protein);
  $('#a-extra').textContent = `${m.kcal != null ? Math.round(m.kcal) + ' kcal' : 'kcal sem dados'} · ${m.carbs != null ? fmt(m.carbs) + ' g de hidratos' : 'hidratos sem dados'}`;
}
$('#a-grams').addEventListener('input', updateAmount);
$('#a-quick').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) { $('#a-grams').value = b.dataset.g; updateAmount(); } });
$('#a-save').addEventListener('click', () => {
  const p = state.products[amountPid]; const g = num($('#a-grams').value);
  if (!(g > 0)) { toast('Indica as gramas que comeste'); return; }
  close('#dlg-amount');
  const data = { grams: g, meal: chipMeal('#a-meals'), ...macros(p, g) };
  if (amountEntry) { p.lastGrams = g; updateEntry(amountEntry.id, { ...data, name: p.name }); }
  else logEntry({ pid: p.id, name: p.name, ...data });
});
$('#a-edit').addEventListener('click', () => { close('#dlg-amount'); openProduct({ id: amountPid }); });

/* ---------- Produto ---------- */
let editing = null; let afterSaveLog = false;
function openProduct({ id, code, prefill, note, fromScan }) {
  editing = id || null; afterSaveLog = !!fromScan;
  const p = id ? state.products[id] : { name: '', brand: '', p100: '', k100: '', c100: '', unitG: '', code: code || '', ...(prefill || {}) };
  $('#prod-title').textContent = id ? 'Editar produto' : 'Novo produto';
  $('#prod-lede').textContent = id ? 'Alterações não mudam os registos já feitos.' : 'Confirma os valores com o rótulo antes de guardar.';
  $('#p-name').value = p.name || '';
  $('#p-brand').value = p.brand || '';
  $('#p-p100').value = toField(p.p100);
  $('#p-k100').value = p.k100 != null && p.k100 !== '' ? Math.round(p.k100) : '';
  $('#p-c100').value = toField(p.c100);
  $('#p-unit').value = toField(p.unitG);
  $('#p-code').value = p.code || '';
  $('#p-delete').hidden = !id;
  $('#ocr-status').textContent = '';
  setNote(note);
  open('#dlg-product');
}
function setNote(note) {
  $('#prod-note').innerHTML = note ? `<div class="note${note.warn ? ' warn' : ''}">${note.html}</div>` : '';
}
$('#p-save').addEventListener('click', () => {
  const name = $('#p-name').value.trim();
  const p100 = num($('#p-p100').value);
  const k100 = optNum($('#p-k100').value);
  const c100 = optNum($('#p-c100').value);
  const unitG = num($('#p-unit').value);
  const code = $('#p-code').value.replace(/\D/g, '');
  if (!name) { toast('Dá um nome ao produto'); $('#p-name').focus(); return; }
  if (!(p100 >= 0 && p100 <= 100)) { toast('A proteína por 100 g tem de estar entre 0 e 100'); $('#p-p100').focus(); return; }
  if (k100 != null && !(k100 >= 0 && k100 <= 950)) { toast('As calorias por 100 g têm de estar entre 0 e 950'); $('#p-k100').focus(); return; }
  if (c100 != null && !(c100 >= 0 && c100 <= 100)) { toast('Os hidratos por 100 g têm de estar entre 0 e 100'); $('#p-c100').focus(); return; }
  if (code) {
    const other = findByCode(code);
    if (other && other.id !== editing) { toast(`Esse código já pertence a "${other.name}"`); return; }
  }
  const id = editing || uid();
  const prev = state.products[id] || {};
  state.products[id] = { ...prev, id, name, brand: $('#p-brand').value.trim(), p100, k100, c100, unitG: unitG > 0 ? unitG : null, code: code || null, updated: Date.now() };
  save(); close('#dlg-product'); render();
  if (afterSaveLog) openAmount(id); else toast('Produto guardado');
});
$('#p-delete').addEventListener('click', () => {
  if (!editing || !confirm('Apagar este produto? Os registos já feitos mantêm-se.')) return;
  delete state.products[editing]; save(); close('#dlg-product'); render(); toast('Produto apagado');
});

/* ---------- Adicionar ---------- */
$('#add-btn').addEventListener('click', () => { $('#add-search').value = ''; renderAddList(); open('#dlg-add'); setTimeout(() => $('#add-search').focus(), 50); });
$('#add-search').addEventListener('input', renderAddList);
function renderAddList() {
  const rows = productRows($('#add-search').value).slice(0, 60);
  $('#add-list').innerHTML = rows.length ? rows.map((p) => `<li data-pick="${p.id}"><div class="main"><div class="name">${esc(p.name)}</div><div class="sub">${per100(p)}</div></div></li>`).join('')
    : `<li class="empty">${Object.keys(state.products).length ? 'Nada encontrado.' : 'Ainda não tens produtos guardados.'}</li>`;
}
$('#add-list').addEventListener('click', (e) => { const li = e.target.closest('[data-pick]'); if (li) { close('#dlg-add'); openAmount(li.dataset.pick); } });
$('#add-new').addEventListener('click', () => { close('#dlg-add'); openProduct({ fromScan: true }); });
$('#add-quick').addEventListener('click', () => { close('#dlg-add'); openQuick(); });

let quickEntry = null;
function openQuick(entry) {
  quickEntry = entry || null;
  $('#q-title').textContent = entry ? 'Editar registo' : 'Registo rápido';
  $('#q-prot').value = entry ? toField(Math.round(entry.protein * 10) / 10) : '';
  $('#q-kcal').value = entry && entry.kcal != null ? Math.round(entry.kcal) : '';
  $('#q-carbs').value = entry && entry.carbs != null ? toField(Math.round(entry.carbs * 10) / 10) : '';
  $('#q-desc').value = entry ? entry.name : '';
  mealChips('#q-meals', entry ? (entry.meal || mealFor(entry.t)) : mealFor(Date.now()));
  open('#dlg-quick');
  if (!entry) setTimeout(() => $('#q-prot').focus(), 50);
}
$('#q-save').addEventListener('click', () => {
  const p = num($('#q-prot').value);
  if (!(p >= 0 && p < 500)) { toast('Indica as gramas de proteína (pode ser 0)'); return; }
  const data = { name: $('#q-desc').value.trim() || 'Registo rápido', protein: p, kcal: optNum($('#q-kcal').value), carbs: optNum($('#q-carbs').value), meal: chipMeal('#q-meals') };
  close('#dlg-quick');
  if (quickEntry) updateEntry(quickEntry.id, data);
  else logEntry({ pid: null, grams: null, ...data });
});

/* ---------- Definições ---------- */
$('#open-settings').addEventListener('click', openSettings);
function openSettings() {
  $('#s-goal').value = state.goal;
  $('#s-kcal').value = state.goalKcal || '';
  $('#s-carbs').value = state.goalCarbs || '';
  const le = state.lastExport;
  const days = le ? Math.floor((Date.now() - le) / 864e5) : null;
  $('#s-backup').textContent = le == null ? 'Ainda não fizeste nenhuma cópia.' : days === 0 ? 'Última cópia: hoje.' : `Última cópia: há ${days} dia${days > 1 ? 's' : ''}.`;
  $('#s-backup').classList.toggle('warn', le == null || days > 14);
  open('#dlg-settings');
}
$('#s-save').addEventListener('click', () => {
  const g = Math.round(num($('#s-goal').value));
  const k = $('#s-kcal').value.trim() ? Math.round(num($('#s-kcal').value)) : null;
  const c = $('#s-carbs').value.trim() ? Math.round(num($('#s-carbs').value)) : null;
  if (!(g >= 10 && g <= 500)) { toast('A meta de proteína tem de estar entre 10 e 500 g'); return; }
  if (k != null && !(k >= 800 && k <= 8000)) { toast('A meta de calorias tem de estar entre 800 e 8000'); return; }
  if (c != null && !(c >= 10 && c <= 1000)) { toast('A meta de hidratos tem de estar entre 10 e 1000 g'); return; }
  state.goal = g; state.goalKcal = k; state.goalCarbs = c;
  save(); close('#dlg-settings'); render(); toast('Metas atualizadas');
});
$('#s-export').addEventListener('click', () => {
  state.lastExport = Date.now(); save();
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `proteina-${dayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  $('#s-backup').textContent = 'Última cópia: hoje.'; $('#s-backup').classList.remove('warn');
});
$('#s-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d.products || !d.log) throw new Error();
    if (!confirm('Substituir os dados deste telemóvel pelos do ficheiro?')) return;
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, { goal: 180, goalKcal: null, goalCarbs: null }, d);
    seedGeneric(); save(); close('#dlg-settings'); render(); toast('Dados importados');
  } catch { toast('Ficheiro inválido'); }
});

/* ---------- Código de barras ---------- */
const FORMATS_NATIVE = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let stream = null, scanning = false, zxReader = null;

function zxingReader() {
  if (!window.ZXing) return null;
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  return new ZXing.BrowserMultiFormatReader(hints, 200);
}
async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const sup = await BarcodeDetector.getSupportedFormats();
    const f = FORMATS_NATIVE.filter((x) => sup.includes(x));
    return f.length ? new BarcodeDetector({ formats: f }) : null;
  } catch { return null; }
}

$('#scan-btn').addEventListener('click', startScan);
$('#dlg-scan').addEventListener('close', stopScan);

async function startScan() {
  open('#dlg-scan');
  const status = $('#scan-status');
  status.innerHTML = '<span class="spinner"></span>A abrir a câmara…';
  const video = $('#video');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    status.textContent = 'Sem acesso à câmara. Usa "Tirar foto" ou escreve o código.';
    return;
  }
  video.srcObject = stream;
  try { await video.play(); } catch {}
  status.textContent = 'À procura do código…';
  scanning = true;

  const det = await nativeDetector();
  if (det) {
    const loop = async () => {
      if (!scanning) return;
      try {
        const r = await det.detect(video);
        if (r.length) return onCode(r[0].rawValue);
      } catch {}
      setTimeout(loop, 120);
    };
    loop();
  } else {
    zxReader = zxingReader();
    if (!zxReader) { status.textContent = 'O leitor não carregou. Escreve o código.'; return; }
    zxReader.decodeFromStream(stream, video, (res) => { if (res && scanning) onCode(res.getText()); }).catch(() => {});
  }
}
function stopScan() {
  scanning = false;
  if (zxReader) { try { zxReader.reset(); } catch {} zxReader = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  $('#video').srcObject = null;
}
function onCode(raw) {
  const code = String(raw).replace(/\D/g, '');
  if (!code) return;
  scanning = false;
  if (navigator.vibrate) navigator.vibrate(60);
  close('#dlg-scan');
  handleCode(code);
}

$('#scan-manual').addEventListener('click', () => {
  const c = prompt('Código de barras (os números por baixo das barras):');
  if (c && c.replace(/\D/g, '').length >= 8) { close('#dlg-scan'); handleCode(c.replace(/\D/g, '')); }
  else if (c) toast('O código tem de ter pelo menos 8 dígitos');
});
$('#scan-photo').addEventListener('click', () => $('#scan-file').click());
$('#scan-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const status = $('#scan-status'); status.innerHTML = '<span class="spinner"></span>A ler a foto…';
  const url = URL.createObjectURL(f);
  try {
    let code = null;
    const det = await nativeDetector();
    if (det) {
      const bmp = await createImageBitmap(f);
      const r = await det.detect(bmp); if (r.length) code = r[0].rawValue;
    }
    if (!code) {
      const rd = zxingReader();
      if (rd) { try { code = (await rd.decodeFromImageUrl(url)).getText(); } catch {} }
    }
    if (code) onCode(code); else status.textContent = 'Não encontrei um código na foto. Tenta mais perto e com boa luz.';
  } finally { URL.revokeObjectURL(url); }
});

async function handleCode(code) {
  const p = findByCode(code);
  if (p) return openAmount(p.id);

  openProduct({ code, fromScan: true, note: { html: '<span class="spinner"></span>Produto novo. A procurar no Open Food Facts…' } });
  const info = await lookupOFF(code);
  if (!$('#dlg-product').open || $('#p-code').value !== code) return; // o utilizador saiu entretanto

  if (!info) {
    setNote({ html: 'Não encontrei este produto online. Preenche o nome e usa <b>Ler valores da etiqueta</b>.' });
    return;
  }
  const fill = (sel, v) => { if (v != null && !$(sel).value) $(sel).value = toField(v); };
  fill('#p-name', info.name); fill('#p-brand', info.brand);
  fill('#p-p100', info.p100); fill('#p-k100', info.k100 != null ? Math.round(info.k100) : null);
  fill('#p-c100', info.c100); fill('#p-unit', info.unitG);

  const rcn = /^2\d{7}$/.test(code) || /^02\d{11}$/.test(code);
  const parts = ['Dados do Open Food Facts. Confirma com o rótulo.'];
  let warn = false;
  const missing = [info.p100 == null && 'proteína', info.k100 == null && 'calorias', info.c100 == null && 'hidratos'].filter(Boolean);
  if (missing.length) { parts.push(`Faltam ${missing.join(', ')} nesta ficha: usa <b>Ler valores da etiqueta</b>.`); warn = true; }
  if (rcn && !info.pt) { parts.push('Este código é reutilizado pelo Lidl noutros países e a ficha não é de Portugal. Verifica se é mesmo o teu produto.'); warn = true; }
  setNote({ html: parts.join(' '), warn });
}

let lookupFailed = false; // true se a última pesquisa falhou por rede (e não por o produto não existir)
async function lookupOFF(code) {
  lookupFailed = false;
  if (!navigator.onLine) { lookupFailed = true; return null; }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_pt,brands,nutriments,product_quantity,product_quantity_unit,countries_tags`, { signal: ctrl.signal });
    if (r.status === 404) return null;
    if (!r.ok) { lookupFailed = true; return null; }
    const d = await r.json();
    if (d.status !== 1 || !d.product) return null;
    const pr = d.product; const n = pr.nutriments || {};
    const r1 = (v) => (v != null && isFinite(num(v)) ? Math.round(num(v) * 10) / 10 : null);
    let kcal = r1(n['energy-kcal_100g']);
    if (kcal == null && n.energy_100g != null && isFinite(num(n.energy_100g))) kcal = Math.round(num(n.energy_100g) / 4.184); // só kJ
    const q = num(pr.product_quantity);
    return {
      name: pr.product_name_pt || pr.product_name || '',
      brand: (pr.brands || '').split(',')[0].trim(),
      p100: r1(n.proteins_100g),
      k100: kcal,
      c100: r1(n.carbohydrates_100g),
      unitG: q > 0 && q < 3000 && (!pr.product_quantity_unit || /^g$/i.test(pr.product_quantity_unit)) ? q : null,
      pt: (pr.countries_tags || []).includes('en:portugal'),
    };
  } catch { lookupFailed = true; return null; }
  finally { clearTimeout(t); }
}

/* Produtos guardados antes desta versão: vai buscar calorias e hidratos em segundo plano. */
async function backfill() {
  if (!navigator.onLine) return;
  const todo = Object.values(state.products).filter((p) => p.code && !p.generic && (p.k100 == null || p.c100 == null) && !p.backfilled);
  let n = 0;
  for (const p of todo) {
    const info = await lookupOFF(p.code);
    if (lookupFailed) break; // sem rede: tenta na próxima abertura
    p.backfilled = true;
    if (info) {
      if (p.k100 == null && info.k100 != null) { p.k100 = info.k100; n++; }
      if (p.c100 == null && info.c100 != null) p.c100 = info.c100;
    }
    save();
    await new Promise((r) => setTimeout(r, 400)); // não sobrecarregar a API
  }
  if (n) { render(); toast(`Calorias e hidratos completados em ${n} produto${n > 1 ? 's' : ''}`); }
}

/* ---------- Ler etiqueta (OCR no telemóvel) ---------- */
let ocrWorker = null;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function getOcr(status) {
  if (ocrWorker) return ocrWorker;
  if (!window.Tesseract) await loadScript('lib/tesseract.min.js');
  const base = new URL('lib/', location.href).href;
  ocrWorker = await Tesseract.createWorker('por', 1, {
    workerPath: base + 'worker.min.js',
    corePath: base + 'core',
    langPath: base + 'lang',
    gzip: true,
    logger: (m) => { if (m.status === 'recognizing text') status.innerHTML = `<span class="spinner"></span>A ler a etiqueta… ${Math.round(m.progress * 100)}%`; },
  });
  return ocrWorker;
}

$('#read-label').addEventListener('click', () => $('#label-file').click());
$('#label-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const status = $('#ocr-status');
  const btn = $('#read-label'); btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span>A preparar o leitor (a primeira vez demora mais)…';
  try {
    const canvas = await prepImage(f);
    const w = await getOcr(status);
    const { data } = await w.recognize(canvas);
    const v = parseLabel(data.text);
    const got = [];
    if (v.p != null) { $('#p-p100').value = toField(v.p); got.push(`proteína ${fmt(v.p)} g`); }
    if (v.k != null) { $('#p-k100').value = Math.round(v.k); got.push(`${Math.round(v.k)} kcal`); }
    if (v.c != null) { $('#p-c100').value = toField(v.c); got.push(`hidratos ${fmt(v.c)} g`); }
    if (got.length) {
      const miss = [v.p == null && 'proteína', v.k == null && 'calorias', v.c == null && 'hidratos'].filter(Boolean);
      status.textContent = `Li ${got.join(', ')}.${miss.length ? ' Não encontrei ' + miss.join(', ') + '.' : ''} Confirma que é a coluna "por 100 g".`;
    } else {
      status.textContent = 'Não encontrei os valores. Aproxima-te da tabela, evita reflexos, ou escreve-os à mão.';
    }
  } catch (err) {
    console.error(err);
    status.textContent = 'O leitor de etiquetas falhou. Escreve os valores à mão.';
  } finally { btn.disabled = false; }
});

async function prepImage(file) {
  const bmp = await createImageBitmap(file);
  const maxSide = 2000;
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    y = Math.max(0, Math.min(255, (y - 128) * 1.5 + 128));
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function parseLabel(text) {
  const lines = text.toLowerCase().replace(/[|]/g, ' ').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const small = /(\d{1,2}(?:[.,]\d)?)\s*(?:g\b|9\b)?/g; // até 99,9 g (o OCR às vezes lê "g" como "9")
  const firstIn = (s, re, max) => [...s.matchAll(re)].map((x) => num(x[1])).filter((n) => n >= 0 && n <= max)[0];
  const after = (i, re, labelRe, max) => {
    const m = lines[i].match(labelRe);
    const rest = lines[i].slice(m.index + m[0].length);
    let v = firstIn(rest, re, max);
    if (v == null && lines[i + 1]) v = firstIn(lines[i + 1], re, max);
    return v ?? null;
  };
  const out = { p: null, k: null, c: null };
  const protRe = /pr[o0]t[eéè][il1íì|]?n[a-z]{0,3}|protein|prot\./;
  const carbRe = /hidrat[o0]s?(?: de carb[o0]n[o0])?|carb[o0]h?idrat[o0]s?|glúcidos|glucidos/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (out.p == null && protRe.test(l)) out.p = after(i, small, protRe, 100);
    if (out.c == null && carbRe.test(l) && !/a[çc][uú]car/.test(l)) out.c = after(i, small, carbRe, 100);
    if (out.k == null) {
      const km = l.match(/(\d{1,4}(?:[.,]\d)?)\s*k\s*ca[l1]/); // "250 kcal"
      if (km && num(km[1]) <= 950) out.k = num(km[1]);
    }
  }
  if (out.k == null) { // só kJ: converte
    for (const l of lines) { const kj = l.match(/(\d{2,4})\s*k\s*j/); if (kj && num(kj[1]) <= 4000) { out.k = Math.round(num(kj[1]) / 4.184); break; } }
  }
  return out;
}

/* ---------- Arranque ---------- */
render();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // se estavas a ver "hoje" e o dia mudou, acompanha
  if (lastToday !== dayKey()) { if (viewDay === lastToday) viewDay = dayKey(); lastToday = dayKey(); }
  render();
});
let lastToday = dayKey();
setTimeout(backfill, 3000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
