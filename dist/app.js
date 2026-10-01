'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const form = $('#budget-form');
  const keys = ['income', 'expense', 'housing', 'seed', 'principal', 'rate', 'years'];
  const defaults = { income: 600, expense: 300, housing: 40, seed: 20000, principal: 40000, rate: 4.8, years: 30 };
  const format = (number, decimals = 1) => number.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  let lastValid = null;
  let toastTimer;

  function toast(message) {
    const element = $('#toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 3600);
  }

  function readInputs() {
    return Object.fromEntries(keys.map(key => [key, form.elements[key].value.trim() === '' ? NaN : Number(form.elements[key].value)]));
  }

  function validate(values) {
    const names = { income: '월소득', expense: '기존 월지출', housing: '기존 거주비', seed: '가용 종잣돈', principal: '대출 원금', rate: '금리', years: '상환 기간' };
    for (const key of keys) {
      if (typeof values[key] !== 'number' || !Number.isFinite(values[key])) return { field: key, message: `${names[key]}에 숫자를 입력해주세요.` };
      const maximum = key === 'rate' ? 30 : key === 'years' ? 50 : 1000000;
      const minimum = key === 'years' ? 1 : 0;
      if (values[key] < minimum || values[key] > maximum) return { field: key, message: `${names[key]}은 ${minimum}–${format(maximum, 0)} 범위로 입력해주세요.` };
    }
    if (!Number.isInteger(values.years)) return { field: 'years', message: '상환 기간은 1–50년의 정수로 입력해주세요.' };
    if (values.housing > values.expense) return { field: 'housing', message: '없어지는 거주비는 기존 월지출에 포함된 금액이어야 합니다. 기존 월지출보다 크게 입력할 수 없습니다.' };
    return null;
  }

  function calculate(values) {
    const months = values.years * 12;
    const monthlyRate = values.rate / 1200;
    // expm1 keeps low-interest cases stable; the zero-interest branch avoids 0/0.
    const payment = values.principal === 0 ? 0 : monthlyRate === 0
      ? values.principal / months
      : values.principal * monthlyRate / (-Math.expm1(-months * Math.log1p(monthlyRate)));
    const living = values.expense - values.housing;
    const expense = living + payment;
    const balance = values.income - expense;
    return { payment, living, expense, balance, funds: values.seed + values.principal };
  }

  function formatFunds(amount) {
    if (amount < 10000) return `${format(amount, 0)}만 원`;
    const eok = Math.floor(amount / 10000);
    const remainder = amount - eok * 10000;
    return `${format(eok, 0)}억${remainder > 0 ? ` ${format(remainder, 0)}만` : ''} 원`;
  }

  function updateCalculator() {
    const values = readInputs();
    const error = validate(values);
    const result = $('.calculator-result');
    for (const key of keys) {
      form.elements[key].removeAttribute('aria-invalid');
      form.elements[key].removeAttribute('aria-describedby');
    }
    $('#calc-error').hidden = !error;
    result.classList.toggle('is-invalid', Boolean(error));
    if (error) {
      form.elements[error.field].setAttribute('aria-invalid', 'true');
      form.elements[error.field].setAttribute('aria-describedby', 'calc-error');
      $('#calc-error').textContent = error.message;
      result.classList.remove('is-negative');
      $('#result-balance').textContent = '—';
      $('#balance-message').textContent = '입력 조건을 확인하면 다시 계산됩니다.';
      $('#result-payment').textContent = '—';
      $('#result-expense').textContent = '—';
      $('#result-funds').textContent = '—';
      for (const id of ['living', 'repayment', 'remaining']) $(`#calc-${id}-bar`).style.width = '0%';
      lastValid = null;
      return null;
    }
    const calculated = calculate(values);
    lastValid = { inputs: values, ...calculated };
    const negative = calculated.balance < -0.0000001;
    const zero = Math.abs(calculated.balance) < 0.0000001;
    result.classList.toggle('is-negative', negative);
    const roundedBalance = Math.round(Math.abs(calculated.balance) * 10) / 10;
    $('#result-balance').textContent = `${zero ? '' : negative ? '−' : '＋'}${format(roundedBalance)}`;
    $('#balance-message').textContent = zero
      ? '입력 조건에서는 매달 남는 돈이 없습니다. 추가 지출과 소득 변화도 살펴보세요.'
      : negative
        ? '입력 조건에서는 매달 지출이 소득을 넘습니다. 예산과 생활비를 다시 살펴보세요.'
        : '입력 조건에서는 매달 남는 돈이 있습니다. 추가 비용과 생활 변화를 함께 확인하세요.';
    $('#result-payment').textContent = `${format(calculated.payment)}만 원`;
    $('#result-expense').textContent = `${format(calculated.expense)}만 원`;
    $('#result-funds').textContent = formatFunds(calculated.funds);
    const denominator = Math.max(values.income, calculated.expense, 1);
    $('#calc-living-bar').style.width = `${100 * calculated.living / denominator}%`;
    $('#calc-repayment-bar').style.width = `${100 * calculated.payment / denominator}%`;
    $('#calc-remaining-bar').style.width = `${100 * Math.max(0, calculated.balance) / denominator}%`;
    return lastValid;
  }

  function applyScenario(values, preset) {
    for (const key of keys) form.elements[key].value = values[key];
    $$('[data-preset]').forEach(button => button.classList.toggle('is-selected', button.dataset.preset === preset));
    return updateCalculator();
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => {
    $$('[data-preset]').forEach(button => button.classList.remove('is-selected'));
    updateCalculator();
  });
  $$('[data-preset]').forEach(button => button.addEventListener('click', () => {
    applyScenario({ ...defaults, expense: button.dataset.preset === 'b' ? 450 : 300 }, button.dataset.preset);
    toast(`부부 ${button.dataset.preset.toUpperCase()}의 조건을 불러왔습니다.`);
  }));
  $('#reset-calculator').addEventListener('click', () => {
    applyScenario(defaults, 'a');
    toast('강의의 부부 A 조건으로 초기화했습니다.');
  });
  applyScenario(defaults, 'a');

  const purposePrompts = {
    living: '나와 가족의 출퇴근·돌봄·학교 등 실제 생활에서 포기하기 어려운 조건부터 적어보세요.',
    balance: '꼭 지킬 생활 조건과 예산 때문에 양보할 조건을 각각 하나씩 적어보세요.',
    value: '신축·넓이 외에도 입지와 다수의 수요를 비교할 수 있도록 후보의 범위를 넓혀보세요.'
  };
  $$('[data-purpose]').forEach(button => button.addEventListener('click', () => {
    $$('[data-purpose]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    $('#purpose-prompt').textContent = purposePrompts[button.dataset.purpose];
  }));

  function countChecked(group) {
    return $$(`[data-check="${group}"]:checked`).length;
  }
  $$('[data-check]').forEach(input => input.addEventListener('change', () => {
    const self = countChecked('self');
    $('#self-status').textContent = `${self} / 4 확인 · ${self === 4 ? '각 답의 근거를 나의 준비 노트에 남겨보세요.' : '모르는 항목부터 차근차근 준비하세요.'}`;
    const tasks = countChecked('task');
    $('#task-count').textContent = `${tasks} / 6 준비`;
    $('#task-progress').value = tasks;
  }));

  function download(filename, contents, type = 'text/plain;charset=utf-8') {
    const blob = new Blob(['\uFEFF', contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function currentPurpose() {
    return $('[data-purpose][aria-pressed="true"]').textContent;
  }

  $('#download-note').addEventListener('click', () => {
    const result = updateCalculator();
    const noteValue = id => $(id).value.trim() || '(아직 작성하지 않음)';
    const tasks = $$('[data-check="task"]').map(input => `${input.checked ? '[x]' : '[ ]'} ${input.closest('label').querySelector('b').textContent}`).join('\r\n');
    const cashFlow = result
      ? `월소득: ${format(result.inputs.income)}만 원\r\n기존 월지출: ${format(result.inputs.expense)}만 원\r\n없어지는 거주비: ${format(result.inputs.housing)}만 원\r\n가용 종잣돈: ${format(result.inputs.seed)}만 원\r\n새 대출: ${format(result.inputs.principal)}만 원 / 연 ${format(result.inputs.rate, 3)}% / ${result.inputs.years}년\r\n원리금균등상환 가정의 월 원리금: ${format(result.payment)}만 원\r\n매수 후 월지출: ${format(result.expense)}만 원\r\n매수 후 월 잔액: ${format(result.balance)}만 원\r\n종잣돈 + 대출: ${formatFunds(result.funds)}`
      : '(계산기 입력 조건이 유효하지 않습니다. 다시 확인해주세요.)';
    const content = `내 집의 기준 — 나의 준비 노트\r\n너나위 무료 강의 편집 가이드 · 2026.09.30\r\n\r\n[나의 우선순위]\r\n${currentPurpose()}\r\n${noteValue('#note-priority')}\r\n\r\n[입력한 현금흐름 시나리오]\r\n${cashFlow}\r\n세금·거래비용·수리비 등 미포함. 실제 대출 승인이나 매수 적합성 판단이 아님.\r\n\r\n[후보와 비교 근거]\r\n${noteValue('#note-candidates')}\r\n\r\n[아직 확인할 질문]\r\n${noteValue('#note-questions')}\r\n\r\n[준비 과제]\r\n${tasks}\r\n\r\n[빈 후보 비교표에 적을 것]\r\n단지명 / 매물 가격의 기준 시점과 종류 / 예산과의 관계 / 중심부와의 위치 관계 / 대중교통 접근 / 기피·선호 환경 / 개인 생활 조건 / 현장 특징 / 미확인 사항 / 판단 이유\r\n\r\n자료: 사용자 제공 BowWow_20260930_223048.txt 및 plan.md\r\n금리·시세·시장 평가는 강의 당시의 설명. 녹취에 없는 정책 조건·가격 자료는 추가하지 않음.\r\n`;
    download('내집의기준_나의준비노트.txt', content);
    toast('준비 노트 내려받기를 시작했습니다.');
  });

  $('#download-comparison').addEventListener('click', () => {
    const rows = [
      ['후보 비교 항목', '후보 A', '후보 B', '후보 C'],
      ['단지명', '', '', ''], ['매물 가격', '', '', ''], ['가격의 기준 시점', '', '', ''],
      ['가격의 종류(매물/실거래)', '', '', ''], ['내 예산과의 관계', '', '', ''],
      ['중심부와의 위치 관계', '', '', ''], ['대중교통 접근', '', '', ''],
      ['기피 환경과 확인 근거', '', '', ''], ['선호 환경과 확인 근거', '', '', ''],
      ['일자리·학군 중 확인한 사항', '', '', ''], ['내 생활에서 필요한 조건', '', '', ''],
      ['현장에서 본 특징', '', '', ''], ['아직 확인하지 않은 내용', '', '', ''],
      ['최종 판단 이유', '', '', ''], ['자료와 확인 날짜', '', '', ''],
      ['참고: 확인하지 않은 칸은 비워두세요. 임의 점수와 가중치를 적용하지 않습니다.', '', '', '']
    ];
    const csv = rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
    download('내집의기준_빈후보비교표.csv', csv, 'text/csv;charset=utf-8');
    toast('빈 후보 비교표 내려받기를 시작했습니다.');
  });

  const sources = window.GUIDE_SOURCES || {};
  $$('.table-scroll').forEach((region, tableIndex) => {
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', region.querySelector('caption')?.textContent || '비교표');
    const table = region.querySelector('table');
    // Explicit roles preserve table navigation when narrow screens stack the cells.
    table.setAttribute('role', 'table');
    table.querySelectorAll('thead, tbody').forEach(group => group.setAttribute('role', 'rowgroup'));
    table.querySelectorAll('tr').forEach(row => row.setAttribute('role', 'row'));
    const columns = [...table.querySelectorAll('thead th')];
    const names = columns.map((column, index) => {
      column.id = `table-${tableIndex}-column-${index}`;
      column.setAttribute('role', 'columnheader');
      const label = column.cloneNode(true);
      label.querySelectorAll('.mini-label').forEach(element => element.remove());
      label.querySelectorAll('br').forEach(element => element.replaceWith(' '));
      return label.textContent.replace(/\s+/g, ' ').trim();
    });
    table.querySelectorAll('tbody tr').forEach((row, rowIndex) => {
      const heading = row.querySelector('th');
      heading.id = `table-${tableIndex}-row-${rowIndex}`;
      heading.setAttribute('role', 'rowheader');
      row.querySelectorAll('td').forEach((cell, index) => {
        cell.setAttribute('role', 'cell');
        cell.setAttribute('headers', `${heading.id} ${columns[index + 1].id}`);
        const label = document.createElement('span');
        label.className = 'mobile-cell-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = names[index + 1];
        cell.prepend(label);
      });
    });
  });
  const dialog = $('#source-dialog');
  function openSource(key) {
    const source = sources[key];
    if (!source) return;
    $('#dialog-title').textContent = source.title;
    $('#dialog-time').textContent = `${source.start} – ${source.end} · 오디오 기준`;
    $('#dialog-summary').textContent = source.summary;
    const block = $('#dialog-excerpt');
    block.replaceChildren();
    $('.dialog-excerpt').hidden = !source.excerpts.length;
    for (const text of source.excerpts) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      block.append(paragraph);
    }
    if (!dialog.open) dialog.showModal();
  }
  $$('[data-source]').forEach(button => button.addEventListener('click', () => openSource(button.dataset.source)));
  $('#close-source').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rectangle = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rectangle.left || event.clientX > rectangle.right || event.clientY < rectangle.top || event.clientY > rectangle.bottom)) dialog.close();
  });
  $('#dialog-source-link').addEventListener('click', () => dialog.close());
  const sourceTimeline = $('#source-timeline');
  for (const [key, source] of Object.entries(sources)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = source.title;
    const time = document.createElement('span');
    time.textContent = `${source.start}–${source.end}`;
    button.append(time);
    button.addEventListener('click', () => openSource(key));
    sourceTimeline.append(button);
  }

  const menuToggle = $('.menu-toggle');
  const readingSizes = [100, 115, 130, 150];
  let readingSize = 100;
  try {
    const saved = Number(localStorage.getItem('home-guide-reading-size'));
    if (readingSizes.includes(saved)) readingSize = saved;
  } catch (_) { /* Reading controls also work when local storage is unavailable. */ }
  function setReadingSize(size) {
    readingSize = size;
    document.documentElement.style.setProperty('--reader-scale', size / 100);
    document.documentElement.toggleAttribute('data-reading-enlarged', size > 100);
    $('#reader-size').textContent = `${size}%`;
    $('#reader-decrease').disabled = size === readingSizes[0];
    $('#reader-increase').disabled = size === readingSizes.at(-1);
    try { localStorage.setItem('home-guide-reading-size', String(size)); } catch (_) { /* Optional preference. */ }
  }
  $('#reader-decrease').addEventListener('click', () => setReadingSize(readingSizes[Math.max(0, readingSizes.indexOf(readingSize) - 1)]));
  $('#reader-increase').addEventListener('click', () => setReadingSize(readingSizes[Math.min(readingSizes.length - 1, readingSizes.indexOf(readingSize) + 1)]));
  $('#reader-reset').addEventListener('click', () => setReadingSize(100));
  setReadingSize(readingSize);
  function closeMenu() {
    $('#mobile-menu').hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '메뉴 열기');
  }
  menuToggle.addEventListener('click', () => {
    const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
    $('#mobile-menu').hidden = !opening;
  });
  $$('#mobile-menu a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('#mobile-menu, .menu-toggle')) closeMenu(); });

  const sectionLinks = $$('.chapter-sidebar nav a');
  const chapterSections = sectionLinks.map(link => $(link.getAttribute('href')));
  const header = $('.site-header');
  let headerHeight = header.getBoundingClientRect().height;
  function measureHeader() {
    headerHeight = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-offset', `${headerHeight}px`);
  }
  new ResizeObserver(measureHeader).observe(header);
  measureHeader();
  let scrollPending = false;
  function updateReading() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    $('#reading-progress').style.width = `${scrollable > 0 ? 100 * window.scrollY / scrollable : 0}%`;
    let active = chapterSections[0];
    for (const section of chapterSections) if (section.getBoundingClientRect().top <= headerHeight + 40) active = section;
    for (const link of sectionLinks) {
      const current = link.hash === `#${active.id}`;
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateReading); }
  }, { passive: true });
  window.addEventListener('resize', () => { updateReading(); if (window.innerWidth > 900) closeMenu(); });
  window.addEventListener('load', updateReading);
  updateReading();

  // The same calculation action can be used by supporting browsers' page-scoped agents.
  const context = document.modelContext;
  if (context && typeof context.registerTool === 'function') {
    const lifecycle = new AbortController();
    const schemaProperties = Object.fromEntries(keys.map(key => [key, {
      type: 'number', minimum: key === 'years' ? 1 : 0,
      maximum: key === 'rate' ? 30 : key === 'years' ? 50 : 1000000,
      description: key === 'rate' ? 'Annual percentage interest rate' : key === 'years' ? 'Whole years, 1–50' : 'Amount in units of 10,000 Korean won'
    }]));
    try {
      Promise.resolve(context.registerTool({
        name: 'configure_monthly_cash_flow', title: '내 현금흐름 시나리오 계산',
        description: 'Set the visible budget calculator inputs and return the same amortized monthly cash flow. This does not determine loan eligibility or recommend a purchase.',
        inputSchema: { type: 'object', properties: schemaProperties, required: keys, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object' || Object.keys(input).some(key => !keys.includes(key))) throw new Error('Provide only the seven calculator inputs.');
          const failure = validate(input);
          if (failure) throw new Error(failure.message);
          const result = applyScenario(input);
          return { unit: '10,000 KRW', monthlyPayment: result.payment, monthlyExpense: result.expense, monthlyBalance: result.balance, seedPlusLoan: result.funds, assumption: 'equal principal and interest amortization; taxes, transaction and repair costs excluded' };
        }
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch (_) { /* Unsupported draft implementations do not affect the guide. */ }
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  }
})();
