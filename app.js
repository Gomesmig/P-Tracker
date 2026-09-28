'use strict';

/* ---------- Dados ---------- */
const KEY = 'proteina.v1';
const $ = (s) => document.querySelector(s);
const state = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.products && d.log) return { goal: 180, ...d };
  } catch (e) {}
  return { goal: 180, products: {}, log: {} };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('Não foi possível guardar. O armazenamento está cheio?'); }
}
/* ---------- Alimentos sem código de barras ----------
   Valores médios de proteína por 100 g (tabelas de composição de alimentos).
   "cru" = pesar antes de cozinhar; "cozinhado" = pesar já no prato. */
const GENERIC = [
  ['g-frango-cru', 'Peito de frango (cru)', 23, null],
  ['g-frango-coz', 'Peito de frango (cozinhado)', 31, null],
  ['g-coxa-coz', 'Coxa de frango sem pele (cozinhada)', 26, null],
  ['g-peru-cru', 'Peito de peru (cru)', 22, null],
  ['g-peru-coz', 'Peito de peru (cozinhado)', 29, null],
  ['g-vitela-cru', 'Vitela magra (crua)', 21, null],
  ['g-vitela-coz', 'Vitela magra (cozinhada)', 29, null],
  ['g-vaca-cru', 'Bife de vaca magro (cru)', 22, null],
  ['g-vaca-coz', 'Bife de vaca magro (grelhado)', 29, null],
  ['g-picada-cru', 'Carne picada de vaca (crua)', 20, null],
  ['g-picada-coz', 'Carne picada de vaca (cozinhada)', 26, null],
  ['g-porco-cru', 'Lombo de porco (cru)', 21, null],
  ['g-porco-coz', 'Lombo de porco (cozinhado)', 29, null],
  ['g-atum-nat', 'Atum em lata ao natural (escorrido)', 25, 56],
  ['g-atum-oleo', 'Atum em lata em óleo (escorrido)', 26, 56],
  ['g-atum-fresco', 'Atum fresco (grelhado)', 29, null],
  ['g-salmao-cru', 'Salmão (cru)', 20, null],
  ['g-salmao-coz', 'Salmão (grelhado)', 25, null],
  ['g-pescada', 'Pescada (cozida)', 20, null],
  ['g-bacalhau', 'Bacalhau demolhado (cozido)', 23, null],
  ['g-dourada', 'Dourada ou robalo (grelhado)', 25, null],
  ['g-camarao', 'Camarão (cozido)', 24, null],
  ['g-polvo', 'Polvo (cozido)', 30, null],
  ['g-ovo', 'Ovo inteiro', 12.5, 50],
  ['g-claras', 'Claras de ovo', 11, 33],
  ['g-queijo-fresco', 'Queijo fresco', 11, null],
  ['g-requeijao', 'Requeijão', 11, null],
  ['g-leite', 'Leite', 3.3, 250],
  ['g-lentilhas', 'Lentilhas (cozidas)', 9, null],
  ['g-grao', 'Grão-de-bico (cozido)', 8.5, null],
  ['g-feijao', 'Feijão (cozido)', 8, null],
  ['g-tofu', 'Tofu firme', 15, null],
  ['g-aveia', 'Flocos de aveia', 13.5, 40],
  ['g-pao', 'Pão de trigo', 9, 50],
  ['g-arroz', 'Arroz (cozido)', 2.7, null],
  ['g-massa', 'Massa (cozida)', 5.5, null],
  ['g-batata', 'Batata (cozida)', 2, null],
  ['g-amendoim', 'Amendoim', 25, 30],
  ['g-amendoas', 'Amêndoas', 21, 30],
];
const SEED_VERSION = 1;
function seedGeneric() {
  if ((state.seedVersion || 0) >= SEED_VERSION) return;
  const seeded = new Set(state.seeded || []);
  for (const [id, name, p100, unitG] of GENERIC) {
    if (seeded.has(id)) continue; // já foi adicionado antes (mesmo que o tenhas apagado)
    if (!state.products[id]) state.products[id] = { id, name, brand: '', p100, unitG, code: null, generic: true, updated: Date.now() };
    seeded.add(id);
  }
  state.seeded = [...seeded]; state.seedVersion = SEED_VERSION;
  save();
}
seedGeneric();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const dayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('pt-PT');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function today() { return state.log[dayKey()] || []; }
function dayTotal(k) { return (state.log[k] || []).reduce((s, e) => s + e.protein, 0); }
function findByCode(code) { return Object.values(state.products).find((p) => p.code === code); }

function logEntry(entry) {
  const k = dayKey();
  (state.log[k] = state.log[k] || []).push({ id: uid(), t: Date.now(), ...entry });
  if (entry.pid && state.products[entry.pid]) {
    state.products[entry.pid].uses = (state.products[entry.pid].uses || 0) + 1;
    state.products[entry.pid].lastGrams = entry.grams;
  }
  save(); render();
  toast(`+${fmt(entry.protein)} g de proteína`);
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

/* ---------- Render ---------- */
function render() { renderToday(); renderProducts(); renderHistory(); }

function renderToday() {
  const goal = state.goal;
  const total = dayTotal(dayKey());
  const shown = Math.round(total);
  const scale = goal * 1.1; // folga no topo do copo para se ver a marca da meta
  const pct = Math.min(total / scale, 1);
  const done = shown >= goal;
  $('#today-label').textContent = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#total').textContent = shown;
  $('#goal-label').textContent = goal;
  $('#left').textContent = done ? (shown > goal ? `Meta cumprida, +${shown - goal} g` : 'Meta cumprida') : `Faltam ${goal - shown} g`;
  $('#left').classList.toggle('done', done);
  $('#liquid').style.height = pct * 100 + '%';
  $('#beaker').classList.toggle('done', done);

  // marcas do copo
  const b = $('#beaker');
  b.querySelectorAll('.tick').forEach((t) => t.remove());
  const step = goal <= 100 ? 10 : 20;
  for (let v = step; v <= goal; v += step) {
    const t = document.createElement('div');
    const major = v % (step * 2) === 0 || v === goal;
    t.className = 'tick' + (major ? ' major' : '');
    t.style.bottom = (v / scale) * 100 + '%';
    if (major && v !== goal) t.innerHTML = `<span>${v}</span>`;
    if (v === goal) { t.classList.add('goal'); t.innerHTML = `<span>${v}</span>`; }
    b.appendChild(t);
  }

  // favoritos
  const favs = Object.values(state.products).filter((p) => p.uses).sort((a, b) => b.uses - a.uses).slice(0, 8);
  $('#favs-wrap').hidden = !favs.length;
  $('#favs').innerHTML = favs.map((p) => {
    const g = p.lastGrams || p.unitG || 100;
    return `<button class="chip" data-fav="${p.id}">${esc(p.name)}<b>${fmt((g * p.p100) / 100)} g</b></button>`;
  }).join('');

  const list = today().slice().reverse();
  $('#entries').innerHTML = list.length ? list.map((e) => `
    <li><div class="main"><div class="name">${esc(e.name)}</div>
      <div class="sub">${e.grams ? fmt(e.grams, 0) + ' g · ' : ''}${new Date(e.t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div></div>
      <div class="val">${fmt(e.protein)} g</div>
      <button class="x" data-del="${e.id}" aria-label="Apagar registo">×</button></li>`).join('')
    : `<li class="empty">Ainda não registaste nada hoje. Lê o código de barras do que vais comer.</li>`;
}

$('#favs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav]'); if (!b) return;
  const p = state.products[b.dataset.fav];
  const g = p.lastGrams || p.unitG || 100;
  logEntry({ pid: p.id, name: p.name, grams: g, protein: (g * p.p100) / 100 });
});
$('#entries').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  const k = dayKey();
  state.log[k] = (state.log[k] || []).filter((x) => x.id !== b.dataset.del);
  save(); render(); toast('Registo apagado');
});

function productRows(filter) {
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = norm((filter || '').trim());
  return Object.values(state.products)
    .filter((p) => !q || norm(p.name + ' ' + (p.brand || '')).includes(q))
    .sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name, 'pt'));
}
function renderProducts() {
  const rows = productRows($('#prod-search').value);
  $('#products').innerHTML = rows.length ? rows.map((p) => `
    <li data-edit="${p.id}"><div class="main"><div class="name">${esc(p.name)}</div>
    <div class="sub">${p.generic ? 'Sem código de barras' : esc(p.brand || '')}${(p.brand || p.generic) && p.unitG ? ' · ' : ''}${p.unitG ? 'unidade ' + fmt(p.unitG, 0) + ' g' : ''}</div></div>
    <div class="val">${fmt(p.p100)}<span style="font-size:14px;font-weight:500"> g/100g</span></div></li>`).join('')
    : `<li class="empty">${Object.keys(state.products).length ? 'Nenhum produto encontrado.' : 'Ainda não tens produtos. Aparecem aqui quando leres o primeiro código de barras.'}</li>`;
}
$('#prod-search').addEventListener('input', renderProducts);
$('#products').addEventListener('click', (e) => { const li = e.target.closest('[data-edit]'); if (li) openProduct({ id: li.dataset.edit }); });
$('#new-product-btn').addEventListener('click', () => openProduct({}));

function renderHistory() {
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const vals = days.map((d) => dayTotal(dayKey(d)));
  const max = Math.max(state.goal * 1.15, ...vals);
  const tk = dayKey();
  $('#bars').innerHTML = `<div class="goal" style="bottom:${(state.goal / max) * 100}%"><span>${state.goal} g</span></div>` +
    days.map((d, i) => `<div class="bar${vals[i] >= state.goal ? ' done' : ''}${dayKey(d) === tk ? ' today' : ''}" style="height:${(vals[i] / max) * 100}%" title="${fmt(vals[i], 0)} g"></div>`).join('');
  $('#barlabels').innerHTML = days.map((d) => `<span>${d.getDate()}</span>`).join('');
  const logged = vals.slice(0, 13).filter((v) => v > 0).concat(vals[13] > 0 ? [vals[13]] : []);
  $('#avg').textContent = logged.length ? fmt(logged.reduce((a, b) => a + b, 0) / logged.length, 0) + ' g' : '–';
  $('#hit').textContent = vals.filter((v) => v >= state.goal).length + ' / 14';
}

/* ---------- Quantidade ---------- */
let amountPid = null;
function openAmount(pid) {
  const p = state.products[pid]; amountPid = pid;
  $('#a-name').textContent = p.name;
  const hint = /\(cru|\(crua/.test(p.name) ? ' · pesa antes de cozinhar' : /cozid|cozinhad|grelhad|escorrid/.test(p.name) ? ' · pesa já pronto' : '';
  $('#a-sub').textContent = `${p.brand ? p.brand + ' · ' : ''}${fmt(p.p100)} g de proteína por 100 g${hint}`;
  const opts = [];
  const unitName = /atum em lata/i.test(p.name) ? ['1 lata', '2 latas'] : /claras/i.test(p.name) ? ['1 clara', '2 claras'] : /ovo/i.test(p.name) ? ['1 ovo', '2 ovos'] : /leite/i.test(p.name) ? ['1 copo', '2 copos'] : ['1 unidade', '2 unidades'];
  if (p.unitG) opts.push([p.unitG, unitName[0]], [p.unitG * 2, unitName[1]]);
  if (/claras/i.test(p.name) && p.unitG) opts.push([p.unitG * 3, '3 claras'], [p.unitG * 4, '4 claras']);
  else if (/ovo/i.test(p.name) && p.unitG) opts.push([p.unitG * 3, '3 ovos'], [p.unitG * 4, '4 ovos']);
  if (p.lastGrams && p.lastGrams !== p.unitG) opts.push([p.lastGrams, `Última vez (${fmt(p.lastGrams, 0)} g)`]);
  [100, 150, 200].forEach((g) => opts.push([g, g + ' g']));
  const seen = new Set();
  $('#a-quick').innerHTML = opts.filter(([g]) => !seen.has(g) && seen.add(g)).map(([g, l]) => `<button class="chip" data-g="${g}">${l}</button>`).join('');
  $('#a-grams').value = p.lastGrams || p.unitG || 100;
  updateAmount();
  open('#dlg-amount');
}
function updateAmount() {
  const p = state.products[amountPid]; const g = num($('#a-grams').value);
  $('#a-result').textContent = isFinite(g) ? fmt((g * p.p100) / 100) : '0';
}
$('#a-grams').addEventListener('input', updateAmount);
$('#a-quick').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) { $('#a-grams').value = b.dataset.g; updateAmount(); } });
$('#a-save').addEventListener('click', () => {
  const p = state.products[amountPid]; const g = num($('#a-grams').value);
  if (!(g > 0)) { toast('Indica as gramas que comeste'); return; }
  close('#dlg-amount');
  logEntry({ pid: p.id, name: p.name, grams: g, protein: (g * p.p100) / 100 });
});
$('#a-edit').addEventListener('click', () => { close('#dlg-amount'); openProduct({ id: amountPid }); });

/* ---------- Produto ---------- */
let editing = null; let afterSaveLog = false;
function openProduct({ id, code, prefill, note, fromScan }) {
  editing = id || null; afterSaveLog = !!fromScan;
  const p = id ? state.products[id] : { name: '', brand: '', p100: '', unitG: '', code: code || '', ...(prefill || {}) };
  $('#prod-title').textContent = id ? 'Editar produto' : 'Novo produto';
  $('#prod-lede').textContent = id ? 'Alterações não mudam os registos já feitos.' : 'Confirma os valores com o rótulo antes de guardar.';
  $('#p-name').value = p.name || '';
  $('#p-brand').value = p.brand || '';
  $('#p-p100').value = p.p100 !== '' && p.p100 != null ? String(p.p100).replace('.', ',') : '';
  $('#p-unit').value = p.unitG ? String(p.unitG).replace('.', ',') : '';
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
  const unitG = num($('#p-unit').value);
  const code = $('#p-code').value.replace(/\D/g, '');
  if (!name) { toast('Dá um nome ao produto'); $('#p-name').focus(); return; }
  if (!(p100 >= 0 && p100 <= 100)) { toast('A proteína por 100 g tem de estar entre 0 e 100'); $('#p-p100').focus(); return; }
  if (code) {
    const other = findByCode(code);
    if (other && other.id !== editing) { toast(`Esse código já pertence a "${other.name}"`); return; }
  }
  const id = editing || uid();
  const prev = state.products[id] || {};
  state.products[id] = { ...prev, id, name, brand: $('#p-brand').value.trim(), p100, unitG: unitG > 0 ? unitG : null, code: code || null, updated: Date.now() };
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
  $('#add-list').innerHTML = rows.length ? rows.map((p) => `<li data-pick="${p.id}"><div class="main"><div class="name">${esc(p.name)}</div><div class="sub">${p.generic ? 'Sem código de barras' : esc(p.brand || '')} · ${fmt(p.p100)} g/100 g</div></div></li>`).join('')
    : `<li class="empty">${Object.keys(state.products).length ? 'Nada encontrado.' : 'Ainda não tens produtos guardados.'}</li>`;
}
$('#add-list').addEventListener('click', (e) => { const li = e.target.closest('[data-pick]'); if (li) { close('#dlg-add'); openAmount(li.dataset.pick); } });
$('#add-new').addEventListener('click', () => { close('#dlg-add'); openProduct({ fromScan: true }); });
$('#add-quick').addEventListener('click', () => { close('#dlg-add'); $('#q-prot').value = ''; $('#q-desc').value = ''; open('#dlg-quick'); setTimeout(() => $('#q-prot').focus(), 50); });
$('#q-save').addEventListener('click', () => {
  const p = num($('#q-prot').value);
  if (!(p > 0 && p < 500)) { toast('Indica as gramas de proteína'); return; }
  close('#dlg-quick');
  logEntry({ pid: null, name: $('#q-desc').value.trim() || 'Registo rápido', grams: null, protein: p });
});

/* ---------- Definições ---------- */
$('#open-settings').addEventListener('click', () => { $('#s-goal').value = state.goal; open('#dlg-settings'); });
$('#s-save').addEventListener('click', () => {
  const g = Math.round(num($('#s-goal').value));
  if (!(g >= 10 && g <= 500)) { toast('A meta tem de estar entre 10 e 500 g'); return; }
  state.goal = g; save(); close('#dlg-settings'); render(); toast('Meta atualizada');
});
$('#s-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `proteina-${dayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('#s-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d.products || !d.log) throw new Error();
    if (!confirm('Substituir os dados deste telemóvel pelos do ficheiro?')) return;
    state.goal = d.goal || 180; state.products = d.products; state.log = d.log;
    save(); close('#dlg-settings'); render(); toast('Dados importados');
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
    setNote({ html: 'Não encontrei este produto online. Preenche o nome e usa <b>Ler proteína da etiqueta</b>.' });
    return;
  }
  if (!$('#p-name').value) $('#p-name').value = info.name || '';
  if (!$('#p-brand').value) $('#p-brand').value = info.brand || '';
  if (info.p100 != null && !$('#p-p100').value) $('#p-p100').value = String(info.p100).replace('.', ',');
  if (info.unitG && !$('#p-unit').value) $('#p-unit').value = String(info.unitG).replace('.', ',');

  const rcn = /^2\d{7}$/.test(code) || /^02\d{11}$/.test(code);
  const parts = ['Dados do Open Food Facts. Confirma com o rótulo.'];
  let warn = false;
  if (info.p100 == null) { parts.push('Falta a proteína nesta ficha: usa <b>Ler proteína da etiqueta</b>.'); warn = true; }
  if (rcn && !info.pt) { parts.push('Este código é reutilizado pelo Lidl noutros países e a ficha não é de Portugal. Verifica se é mesmo o teu produto.'); warn = true; }
  setNote({ html: parts.join(' '), warn });
}

async function lookupOFF(code) {
  if (!navigator.onLine) return null;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_pt,brands,nutriments,product_quantity,product_quantity_unit,countries_tags`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== 1 || !d.product) return null;
    const pr = d.product;
    const prot = pr.nutriments && pr.nutriments.proteins_100g;
    const q = num(pr.product_quantity);
    return {
      name: pr.product_name_pt || pr.product_name || '',
      brand: (pr.brands || '').split(',')[0].trim(),
      p100: prot != null && isFinite(num(prot)) ? Math.round(num(prot) * 10) / 10 : null,
      unitG: q > 0 && q < 3000 && (!pr.product_quantity_unit || /^g$/i.test(pr.product_quantity_unit)) ? q : null,
      pt: (pr.countries_tags || []).includes('en:portugal'),
    };
  } catch { return null; }
  finally { clearTimeout(t); }
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
    const val = parseProtein(data.text);
    if (val != null) {
      $('#p-p100').value = String(val).replace('.', ',');
      status.textContent = `Li ${fmt(val)} g por 100 g. Confirma que é a coluna "por 100 g".`;
      $('#p-p100').focus();
    } else {
      status.textContent = 'Não encontrei a linha da proteína. Aproxima-te da tabela, evita reflexos, ou escreve o valor.';
    }
  } catch (err) {
    console.error(err);
    status.textContent = 'O leitor de etiquetas falhou. Escreve o valor à mão.';
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
  // tons de cinzento + contraste
  for (let i = 0; i < d.length; i += 4) {
    let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    y = Math.max(0, Math.min(255, (y - 128) * 1.5 + 128));
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function parseProtein(text) {
  const lines = text.toLowerCase().replace(/[|]/g, ' ').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  // "proteínas", com erros típicos do OCR (0 por o, 1/l por i, acentos perdidos)
  const re = /pr[o0]t[eéè][il1íì|]?n[a-z]{0,3}|protein|prot\./;
  const numRe = /(\d{1,2}(?:[.,]\d)?)\s*(?:g\b|9\b)?/g;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const rest = lines[i].slice(m.index + m[0].length);
    const cand = [...rest.matchAll(numRe)].map((x) => num(x[1])).filter((n) => n >= 0 && n <= 100);
    if (cand.length) return cand[0];
    const next = lines[i + 1] ? [...lines[i + 1].matchAll(numRe)].map((x) => num(x[1])).filter((n) => n >= 0 && n <= 100) : [];
    if (next.length) return next[0];
  }
  return null;
}

/* ---------- Arranque ---------- */
render();
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); }); // muda de dia sozinho
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
