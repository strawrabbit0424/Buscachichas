import { loadLeaderboard, saveScore, loadNickname, saveNickname } from './leaderboard.js';

/* ===================== ASSETS ===================== */
const URL_EXPLOTADA = 'assets/mina_explotada.svg';
const URL_ENCONTRADA = 'assets/mina_encontrada.svg';
// La bandera ahora usa la misma carita "encontrada" en vez de bandera.svg.
const URL_BANDERA = 'assets/mina_encontrada.svg';

/* ===================== CONFIG ===================== */
const DIFFICULTIES = {
  facil:   { label: 'Fácil',   rows: 9,  cols: 9,  mines: 10 },
  medio:   { label: 'Medio',   rows: 16, cols: 16, mines: 40 },
  dificil: { label: 'Difícil', rows: 16, cols: 30, mines: 99 }
};
const DIFF_ORDER = ['facil', 'medio', 'dificil'];

/* ===================== STATE ===================== */
let state = {
  diff: 'facil',
  rows: 9, cols: 9, mines: 10,
  grid: [],
  started: false,
  over: false,
  won: false,
  revealedCount: 0,
  flags: 0,
  startTime: 0,
  timerHandle: null,
  elapsedMs: 0,
  flagMode: false,
  hitKey: null // "r_c" de la mina que causó la derrota, se resetea en cada partida
};
let nickname = '';
let lbActiveTab = 'facil';

/* ===================== DOM REFS ===================== */
const boardEl = document.getElementById('board');
const diffRowEl = document.getElementById('diffRow');
const statMinesEl = document.getElementById('statMines');
const statTimeEl = document.getElementById('statTime');
const resetBtn = document.getElementById('resetBtn');
const flagModeToggle = document.getElementById('flagModeToggle');
const statusLineEl = document.getElementById('statusLine');
const resultPanelEl = document.getElementById('resultPanel');
const lbTabsEl = document.getElementById('lbTabs');
const lbBodyEl = document.getElementById('lbBody');

/* ===================== INIT UI ===================== */
function buildDiffButtons(){
  diffRowEl.innerHTML = '';
  DIFF_ORDER.forEach(key => {
    const d = DIFFICULTIES[key];
    const btn = document.createElement('button');
    btn.className = 'diff-btn' + (key === state.diff ? ' active' : '');
    btn.innerHTML = d.label + '<small>' + d.rows + '×' + d.cols + ' &middot; ' + d.mines + ' minas</small>';
    btn.addEventListener('click', () => startGame(key));
    diffRowEl.appendChild(btn);
  });
}

function buildLbTabs(){
  lbTabsEl.innerHTML = '';
  DIFF_ORDER.forEach(key => {
    const d = DIFFICULTIES[key];
    const btn = document.createElement('button');
    btn.className = 'lb-tab' + (key === lbActiveTab ? ' active' : '');
    btn.textContent = d.label;
    btn.addEventListener('click', () => { lbActiveTab = key; buildLbTabs(); renderLeaderboard(); });
    lbTabsEl.appendChild(btn);
  });
}

function setFaceIcon(mode){
  // mode: 'idle' | 'hit'
  resetBtn.innerHTML = '<img src="' + (mode === 'hit' ? URL_EXPLOTADA : URL_ENCONTRADA) + '" alt="reiniciar">';
}

/* ===================== GAME SETUP ===================== */
function startGame(diffKey){
  state.diff = diffKey;
  const d = DIFFICULTIES[diffKey];
  state.rows = d.rows; state.cols = d.cols; state.mines = d.mines;
  state.grid = [];
  for(let r = 0; r < state.rows; r++){
    const row = [];
    for(let c = 0; c < state.cols; c++){
      row.push({ mine: false, revealed: false, flagged: false, adjacent: 0 });
    }
    state.grid.push(row);
  }
  state.started = false;
  state.over = false;
  state.won = false;
  state.revealedCount = 0;
  state.flags = 0;
  state.elapsedMs = 0;
  state.hitKey = null; // clave: se resetea SIEMPRE al empezar partida nueva
  stopTimer();
  setFaceIcon('idle');
  statusLineEl.textContent = '';
  statusLineEl.classList.remove('status-lose');
  hideResultPanel();
  buildDiffButtons();
  renderBoard();
  updateStats();
  lbActiveTab = diffKey;
  buildLbTabs();
  renderLeaderboard();
}

function placeMines(safeR, safeC){
  const forbidden = new Set();
  for(let dr = -1; dr <= 1; dr++) for(let dc = -1; dc <= 1; dc++){
    const rr = safeR + dr, cc = safeC + dc;
    if(rr >= 0 && rr < state.rows && cc >= 0 && cc < state.cols) forbidden.add(rr + '_' + cc);
  }
  let placed = 0;
  while(placed < state.mines){
    const r = Math.floor(Math.random() * state.rows);
    const c = Math.floor(Math.random() * state.cols);
    const k = r + '_' + c;
    if(forbidden.has(k)) continue;
    if(state.grid[r][c].mine) continue;
    state.grid[r][c].mine = true;
    placed++;
  }
  for(let r = 0; r < state.rows; r++){
    for(let c = 0; c < state.cols; c++){
      if(state.grid[r][c].mine) continue;
      let count = 0;
      for(let dr = -1; dr <= 1; dr++) for(let dc = -1; dc <= 1; dc++){
        if(dr === 0 && dc === 0) continue;
        const rr = r + dr, cc = c + dc;
        if(rr >= 0 && rr < state.rows && cc >= 0 && cc < state.cols && state.grid[rr][cc].mine) count++;
      }
      state.grid[r][c].adjacent = count;
    }
  }
}

/* ===================== RENDER BOARD ===================== */
function renderBoard(){
  boardEl.style.gridTemplateColumns = 'repeat(' + state.cols + ', 1fr)';
  boardEl.innerHTML = '';
  for(let r = 0; r < state.rows; r++){
    for(let c = 0; c < state.cols; c++){
      const cell = state.grid[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r; el.dataset.c = c;

      if(cell.revealed){
        el.classList.add('revealed');
        if(cell.mine){
          // Todas las minas reveladas al perder son minas que NO se encontraron
          // a tiempo (revealAllMines nunca revela una mina ya marcada con bandera),
          // así que todas usan la carita explotada. La que detonaste además
          // recibe un fondo rojizo para distinguirla.
          const key = r + '_' + c;
          if(state.hitKey === key) el.classList.add('mine-hit');
          const img = document.createElement('img');
          img.className = 'icon';
          img.src = URL_EXPLOTADA;
          el.appendChild(img);
        } else if(cell.adjacent > 0){
          el.textContent = cell.adjacent;
          el.classList.add('n' + cell.adjacent);
        }
      } else if(cell.flagged){
        const img = document.createElement('img');
        img.className = 'flag-icon';
        img.src = URL_BANDERA;
        el.appendChild(img);
        if(state.over && !state.won && !cell.mine){
          el.classList.add('flag-wrong');
        }
      }

      el.addEventListener('click', () => onCellPress(r, c, false));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); onCellPress(r, c, true); });
      boardEl.appendChild(el);
    }
  }
}

function onCellPress(r, c, isRightClick){
  if(state.over) return;
  const cell = state.grid[r][c];
  const wantFlag = isRightClick || state.flagMode;

  if(wantFlag){
    if(cell.revealed) return;
    cell.flagged = !cell.flagged;
    state.flags += cell.flagged ? 1 : -1;
    updateStats();
    renderBoard();
    return;
  }

  if(cell.flagged || cell.revealed) return;

  if(!state.started){
    placeMines(r, c);
    state.started = true;
    startTimer();
  }

  if(cell.mine){
    state.hitKey = r + '_' + c;
    revealAllMines();
    endGame(false);
    return;
  }

  revealFlood(r, c);
  checkWin();
  renderBoard();
}

function revealFlood(r, c){
  const stack = [[r, c]];
  while(stack.length){
    const [rr, cc] = stack.pop();
    const cell = state.grid[rr][cc];
    if(cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    state.revealedCount++;
    if(cell.adjacent === 0){
      for(let dr = -1; dr <= 1; dr++) for(let dc = -1; dc <= 1; dc++){
        if(dr === 0 && dc === 0) continue;
        const nr = rr + dr, nc = cc + dc;
        if(nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols){
          const n = state.grid[nr][nc];
          if(!n.revealed && !n.mine && !n.flagged) stack.push([nr, nc]);
        }
      }
    }
  }
}

function revealAllMines(){
  // Las minas que ya marcaste con bandera se consideran "encontradas":
  // se quedan mostrando la bandera y no se pintan como explotadas.
  for(let r = 0; r < state.rows; r++) for(let c = 0; c < state.cols; c++){
    const cell = state.grid[r][c];
    if(cell.mine && !cell.flagged) cell.revealed = true;
  }
}

function checkWin(){
  const total = state.rows * state.cols;
  if(state.revealedCount === total - state.mines){
    endGame(true);
  }
}

function endGame(won){
  state.over = true;
  state.won = won;
  stopTimer();
  setFaceIcon(won ? 'idle' : 'hit');
  renderBoard();
  updateStats();
  if(won){
    showWinPanel();
  } else {
    statusLineEl.textContent = 'boom. revisa el tablero e inténtalo de nuevo.';
    statusLineEl.classList.add('status-lose');
  }
}

/* ===================== TIMER ===================== */
function startTimer(){
  state.startTime = performance.now();
  state.timerHandle = setInterval(() => {
    state.elapsedMs = performance.now() - state.startTime;
    updateStats();
  }, 97);
}
function stopTimer(){
  if(state.timerHandle){ clearInterval(state.timerHandle); state.timerHandle = null; }
}

function updateStats(){
  const minesLeft = Math.max(0, state.mines - state.flags);
  statMinesEl.innerHTML = String(minesLeft).padStart(3, '0') + '<span>Minas</span>';
  const secs = Math.floor(state.elapsedMs / 1000);
  statTimeEl.innerHTML = String(Math.min(secs, 999)).padStart(3, '0') + '<span>Segundos</span>';
}

function formatTime(ms){
  return (ms / 1000).toFixed(2) + 's';
}

/* ===================== FLAG MODE ===================== */
flagModeToggle.addEventListener('click', () => {
  state.flagMode = !state.flagMode;
  flagModeToggle.classList.toggle('active', state.flagMode);
});

resetBtn.addEventListener('click', () => startGame(state.diff));

/* ===================== RESULT PANEL (solo victoria, inline bajo el tablero) ===================== */
function hideResultPanel(){
  resultPanelEl.classList.remove('show');
  resultPanelEl.innerHTML = '';
}

function showWinPanel(){
  const d = DIFFICULTIES[state.diff];
  resultPanelEl.innerHTML = `
    <img class="icon" src="${URL_ENCONTRADA}" alt="">
    <h2>victoria</h2>
    <div class="modal-note">${d.label} · ${d.rows}×${d.cols} · ${d.mines} minas</div>
    <div class="time-big">${formatTime(state.elapsedMs)}</div>
    <input type="text" id="nickInput" placeholder="tu apodo" maxlength="16" value="${nickname.replace(/"/g, '')}">
    <div class="btn-row">
      <button class="btn ghost" id="winSkipBtn">Omitir</button>
      <button class="btn primary" id="winSaveBtn">Guardar tiempo</button>
    </div>
    <div class="modal-note" id="winMsg"></div>
  `;
  resultPanelEl.classList.add('show');
  const input = document.getElementById('nickInput');
  input.focus();
  document.getElementById('winSkipBtn').addEventListener('click', hideResultPanel);
  document.getElementById('winSaveBtn').addEventListener('click', async () => {
    const val = input.value.trim().slice(0, 16);
    if(!val){ input.style.borderColor = 'var(--danger)'; return; }
    nickname = val;
    const msgEl = document.getElementById('winMsg');
    msgEl.textContent = 'guardando...';
    saveNickname(nickname);
    const result = await saveScore(state.diff, nickname, state.elapsedMs);
    msgEl.textContent = result.ok ? 'tiempo guardado' : 'no se pudo guardar';
    if(result.ok){
      lbActiveTab = state.diff;
      buildLbTabs();
      await renderLeaderboard();
    }
  });
}

/* ===================== LEADERBOARD RENDER ===================== */
async function renderLeaderboard(){
  lbBodyEl.innerHTML = '<div class="lb-empty">cargando...</div>';
  const { list, error } = await loadLeaderboard(lbActiveTab);
  if(error){
    lbBodyEl.innerHTML = '<div class="lb-empty">no se pudo conectar con Supabase todavía.</div>';
    return;
  }
  if(!list.length){
    lbBodyEl.innerHTML = '<div class="lb-empty">nadie ha completado esta dificultad todavía. sé el primero.</div>';
    return;
  }
  let rows = '';
  list.forEach((entry, i) => {
    rows += `<tr><td class="rank">${i + 1}</td><td>${escapeHtml(entry.nick)}</td><td>${(entry.ms / 1000).toFixed(2)}s</td><td>${entry.date || ''}</td></tr>`;
  });
  lbBodyEl.innerHTML = `
    <table class="lb-table">
      <thead><tr><th>#</th><th>Apodo</th><th>Tiempo</th><th>Fecha</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ===================== BOOT ===================== */
nickname = loadNickname();
startGame('facil');
