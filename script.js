const STORAGE_KEY = 'registroDejemDelegada';

const defaultState = {
  dejemCount: 0,
  delegadaCount: 0,
  dejemValue: 0,
  delegadaValue: 0,
  currentTab: 'registro'
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...saved };
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

function render() {
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
  switchTab(state.currentTab);
  saveState();
}

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById('screenTitle').textContent = tabName === 'registro' ? 'Registro' : 'Editar';
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
  state = { ...defaultState, currentTab: 'registro' };
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
