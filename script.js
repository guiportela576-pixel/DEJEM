const STORAGE_KEY = 'registroDejemDelegada';

const defaultState = {
  dejemCount: 0,
  delegadaCount: 0,
  dejemValue: 0,
  delegadaValue: 0,
  currentTab: 'registro',
  currentMonth: '',
  history: {}
};

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function buildMonthSnapshot(sourceState) {
  const dejemTotal = sourceState.dejemCount * sourceState.dejemValue;
  const delegadaTotal = sourceState.delegadaCount * sourceState.delegadaValue;

  return {
    dejemCount: sourceState.dejemCount,
    delegadaCount: sourceState.delegadaCount,
    dejemValue: sourceState.dejemValue,
    delegadaValue: sourceState.delegadaValue,
    dejemTotal,
    delegadaTotal,
    totalCount: sourceState.dejemCount + sourceState.delegadaCount,
    totalValue: dejemTotal + delegadaTotal
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...saved, history: saved?.history || {} };
  } catch {
    return { ...defaultState };
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ensureCurrentMonth() {
  const nowMonth = getMonthKey();

  if (!state.currentMonth) {
    state.currentMonth = nowMonth;
    return;
  }

  if (state.currentMonth !== nowMonth) {
    state.history[state.currentMonth] = buildMonthSnapshot(state);
    state.currentMonth = nowMonth;
    state.dejemCount = 0;
    state.delegadaCount = 0;
    state.currentTab = 'registro';
  }
}

function renderHistory() {
  const historyList = document.getElementById('historicoLista');
  const mergedHistory = {
    ...state.history,
    [state.currentMonth]: buildMonthSnapshot(state)
  };

  const months = Object.keys(mergedHistory).sort().reverse();

  if (!months.length) {
    historyList.innerHTML = '<p class="history-empty">Nenhum histórico disponível.</p>';
    return;
  }

  historyList.innerHTML = months.map(monthKey => {
    const item = mergedHistory[monthKey];
    return `
      <div class="history-item">
        <h3>${getMonthLabel(monthKey)}</h3>
        <p>DEJEM: <strong>${item.dejemCount}</strong> x <strong>${money(item.dejemValue)}</strong> = <strong>${money(item.dejemTotal)}</strong></p>
        <p>DELEGADA: <strong>${item.delegadaCount}</strong> x <strong>${money(item.delegadaValue)}</strong> = <strong>${money(item.delegadaTotal)}</strong></p>
        <p>Total do mês: <strong>${item.totalCount}</strong> registros</p>
        <p>Valor do mês: <strong>${money(item.totalValue)}</strong></p>
      </div>
    `;
  }).join('');
}

function render() {
  ensureCurrentMonth();

  document.getElementById('dejemQtd').textContent = state.dejemCount;
  document.getElementById('delegadaQtd').textContent = state.delegadaCount;
  document.getElementById('dejemValor').textContent = money(state.dejemValue);
  document.getElementById('delegadaValor').textContent = money(state.delegadaValue);
  document.getElementById('dejemTotal').textContent = money(state.dejemCount * state.dejemValue);
  document.getElementById('delegadaTotal').textContent = money(state.delegadaCount * state.delegadaValue);
  document.getElementById('qtdTotal').textContent = state.dejemCount + state.delegadaCount;
  document.getElementById('valorTotal').textContent = money((state.dejemCount * state.dejemValue) + (state.delegadaCount * state.delegadaValue));
  document.getElementById('inputDejem').value = state.dejemValue || '';
  document.getElementById('inputDelegada').value = state.delegadaValue || '';
  renderHistory();
  switchTab(state.currentTab);
  saveState();
}

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add('active');
  const titleMap = {
    registro: 'Registro',
    editar: 'Editar',
    historico: 'Histórico'
  };
  document.getElementById('screenTitle').textContent = titleMap[tabName] || 'Registro';
  saveState();
}

document.getElementById('btnDejem').addEventListener('click', () => {
  state.dejemCount += 1;
  render();
});

document.getElementById('btnDelegada').addEventListener('click', () => {
  state.delegadaCount += 1;
  render();
});

document.getElementById('menosDejem').addEventListener('click', () => {
  state.dejemCount = Math.max(0, state.dejemCount - 1);
  render();
});

document.getElementById('menosDelegada').addEventListener('click', () => {
  state.delegadaCount = Math.max(0, state.delegadaCount - 1);
  render();
});

document.getElementById('salvarValores').addEventListener('click', () => {
  const dejem = Number(document.getElementById('inputDejem').value) || 0;
  const delegada = Number(document.getElementById('inputDelegada').value) || 0;
  state.dejemValue = dejem;
  state.delegadaValue = delegada;
  render();
  alert('Valores salvos com sucesso.');
});

document.getElementById('resetarTudo').addEventListener('click', () => {
  if (!confirm('Deseja zerar quantidades e valores?')) return;
  state = {
    ...defaultState,
    currentTab: 'registro',
    currentMonth: getMonthKey(),
    history: {}
  };
  render();
});

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
