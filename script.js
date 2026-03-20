const STORAGE_KEY = 'registroDejemDelegada';

const defaultState = {
  dejemCount: 0,
  delegadaCount: 0,
  dejemValue: 0,
  delegadaValue: 0,
  currentTab: 'registro',
  currentMonth: '',
  history: {},
  calendar: {
    dejem: [],
    delegada: []
  },
  hoursFormType: 'folga',
  hoursRecords: []
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
    return {
      ...defaultState,
      ...saved,
      history: saved?.history || {},
      calendar: {
        dejem: saved?.calendar?.dejem || [],
        delegada: saved?.calendar?.delegada || []
      },
      hoursRecords: saved?.hoursRecords || [],
      currentTab: saved?.currentTab === 'editar' ? 'registro' : (saved?.currentTab || 'registro')
    };
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

function parseHoursValue(value) {
  const normalized = String(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : 0;
}

function formatHours(value) {
  return `${value.toLocaleString('pt-BR')}h`;
}

function getHoursBalance() {
  return state.hoursRecords.reduce((acc, record) => {
    if (record.type === 'horas') return acc + parseHoursValue(record.value);
    if (record.type === 'subtrair_horas') return acc - parseHoursValue(record.value);
    return acc;
  }, 0);
}

function getFolgaBalance() {
  return state.hoursRecords.reduce((acc, record) => {
    if (record.type === 'folga') return acc + parseHoursValue(record.value || 1);
    if (record.type === 'subtrair_folga') return acc - parseHoursValue(record.value || 1);
    return acc;
  }, 0);
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
    state.calendar = {
      dejem: [],
      delegada: []
    };
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

function getCalendarConfig(type) {
  return {
    key: type,
    elementId: type === 'dejem' ? 'calendarDejem' : 'calendarDelegada',
    labelId: type === 'dejem' ? 'calendarMonthDejem' : 'calendarMonthDelegada'
  };
}

function renderCalendar(type) {
  const { key, elementId, labelId } = getCalendarConfig(type);
  const calendarElement = document.getElementById(elementId);
  const labelElement = document.getElementById(labelId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startColumn = (firstDay + 6) % 7;
  const selectedDays = new Set(state.calendar[key] || []);
  const weekLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  labelElement.textContent = getMonthLabel(state.currentMonth);

  let html = weekLabels.map(day => `<div class="weekday">${day}</div>`).join('');

  for (let i = 0; i < startColumn; i += 1) {
    html += '<div class="day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const activeClass = selectedDays.has(day) ? ' selected' : '';
    html += `<button class="day${activeClass}" data-type="${key}" data-day="${day}">${day}</button>`;
  }

  const totalCells = startColumn + daysInMonth;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i += 1) {
      html += '<div class="day empty"></div>';
    }
  }

  calendarElement.innerHTML = html;
}

function renderCalendars() {
  renderCalendar('dejem');
  renderCalendar('delegada');
}

function toggleCalendarDay(type, day) {
  const current = new Set(state.calendar[type] || []);
  if (current.has(day)) {
    current.delete(day);
  } else {
    current.add(day);
  }
  state.calendar[type] = Array.from(current).sort((a, b) => a - b);
  render();
}

function updateHoursFormUI() {
  const isFolga = state.hoursFormType === 'folga';
  const isHoras = state.hoursFormType === 'horas';
  const isSubtrairHoras = state.hoursFormType === 'subtrair_horas';
  const isSubtrairFolga = state.hoursFormType === 'subtrair_folga';
  document.getElementById('tipoFolga').classList.toggle('active', isFolga);
  document.getElementById('tipoHoras').classList.toggle('active', isHoras);
  document.getElementById('tipoSubtrairHoras').classList.toggle('active', isSubtrairHoras);
  document.getElementById('tipoSubtrairFolga').classList.toggle('active', isSubtrairFolga);
  document.getElementById('horasValorLabel').textContent = (isFolga || isSubtrairFolga) ? 'Folga' : 'Horas';
  document.getElementById('horasValorInput').placeholder = isFolga
    ? 'Ex.: 1 folga'
    : isHoras
      ? 'Ex.: 2 horas'
      : isSubtrairHoras
        ? 'Ex.: 2 horas usadas'
        : 'Ex.: 1 folga usada';
  document.getElementById('horasObservacaoInput').placeholder = isFolga
    ? 'Ex.: por ter dobrado de escala no dia 10'
    : isHoras
      ? 'Ex.: por ter trabalhado 2 horas a mais no dia 15 em ocorrência'
      : isSubtrairHoras
        ? 'Ex.: saí 2 horas mais cedo para resolver algo'
        : 'Ex.: usei 1 folga para resolver algo';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRecordDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('pt-BR');
}

function renderHoursRecordItem(record) {
  const typeLabel = record.type === 'folga'
    ? 'Folga adicionada'
    : record.type === 'subtrair_folga'
      ? 'Folga usada'
      : record.type === 'subtrair_horas'
        ? 'Horas usadas'
        : 'Horas adicionadas';

  return `
    <div class="hours-item ${record.type.includes('subtrair') ? 'hours-item-minus' : 'hours-item-plus'}">
      <h3>${typeLabel}: <strong>${escapeHtml(record.value)}</strong></h3>
      <p><strong>Observação:</strong> ${escapeHtml(record.note)}</p>
      ${record.createdAt ? `<p class="hours-date"><strong>Salvo em:</strong> ${escapeHtml(formatRecordDate(record.createdAt))}</p>` : ''}
    </div>
  `;
}

function renderHoursList() {
  const list = document.getElementById('horasLista');
  const saldoHoras = document.getElementById('saldoHoras');
  const saldoFolgas = document.getElementById('saldoFolgas');
  saldoHoras.textContent = formatHours(getHoursBalance());
  saldoFolgas.textContent = String(getFolgaBalance());

  if (!state.hoursRecords.length) {
    list.innerHTML = '<p class="hours-empty">Nenhum registro salvo.</p>';
    return;
  }

  const folgaRecords = state.hoursRecords.filter(record => record.type === 'folga' || record.type === 'subtrair_folga').slice().reverse();
  const horasRecords = state.hoursRecords.filter(record => record.type === 'horas' || record.type === 'subtrair_horas').slice().reverse();

  list.innerHTML = `
    <div class="hours-group">
      <h3 class="hours-group-title">Folgas</h3>
      ${folgaRecords.length ? folgaRecords.map(renderHoursRecordItem).join('') : '<p class="hours-empty">Nenhum registro de folga.</p>'}
    </div>
    <div class="hours-group">
      <h3 class="hours-group-title">Horas</h3>
      ${horasRecords.length ? horasRecords.map(renderHoursRecordItem).join('') : '<p class="hours-empty">Nenhum registro de horas.</p>'}
    </div>
  `;
}

function saveHoursRecord() {
  const valueInput = document.getElementById('horasValorInput');
  const noteInput = document.getElementById('horasObservacaoInput');
  const value = valueInput.value.trim();
  const note = noteInput.value.trim();

  if (!value) {
    alert((state.hoursFormType === 'folga' || state.hoursFormType === 'subtrair_folga') ? 'Digite a folga.' : 'Digite as horas.');
    return;
  }

  if ((state.hoursFormType === 'horas' || state.hoursFormType === 'subtrair_horas' || state.hoursFormType === 'folga' || state.hoursFormType === 'subtrair_folga') && parseHoursValue(value) <= 0) {
    alert((state.hoursFormType === 'folga' || state.hoursFormType === 'subtrair_folga') ? 'Digite uma quantidade de folgas válida.' : 'Digite uma quantidade de horas válida.');
    return;
  }

  if (!note) {
    alert('Digite a observação.');
    return;
  }

  state.hoursRecords.push({
    type: state.hoursFormType,
    value,
    note,
    createdAt: new Date().toISOString()
  });

  valueInput.value = '';
  noteInput.value = '';
  render();
  alert('Registro salvo com sucesso.');
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
  renderCalendars();
  updateHoursFormUI();
  renderHoursList();
  switchTab(state.currentTab);
  saveState();
}

function switchTab(tabName) {
  const targetTab = document.getElementById(`tab-${tabName}`) ? tabName : 'registro';
  state.currentTab = targetTab;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${targetTab}`).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${targetTab}"]`).classList.add('active');
  const titleMap = {
    registro: 'Registro',
    historico: 'Histórico',
    calendario: 'Calendário',
    horas: 'Horas'
  };
  document.getElementById('screenTitle').textContent = titleMap[targetTab] || 'Registro';
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
    history: {},
    calendar: {
      dejem: [],
      delegada: []
    },
    hoursRecords: []
  };
  render();
});

document.getElementById('tipoFolga').addEventListener('click', () => {
  state.hoursFormType = 'folga';
  updateHoursFormUI();
  saveState();
});

document.getElementById('tipoHoras').addEventListener('click', () => {
  state.hoursFormType = 'horas';
  updateHoursFormUI();
  saveState();
});

document.getElementById('tipoSubtrairHoras').addEventListener('click', () => {
  state.hoursFormType = 'subtrair_horas';
  updateHoursFormUI();
  saveState();
});

document.getElementById('tipoSubtrairFolga').addEventListener('click', () => {
  state.hoursFormType = 'subtrair_folga';
  updateHoursFormUI();
  saveState();
});

document.getElementById('salvarHoraRegistro').addEventListener('click', saveHoursRecord);

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.addEventListener('click', event => {
  const dayButton = event.target.closest('.day[data-type][data-day]');
  if (!dayButton) return;
  toggleCalendarDay(dayButton.dataset.type, Number(dayButton.dataset.day));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
