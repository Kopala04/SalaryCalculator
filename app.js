'use strict';

const CURRENCIES = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GEL: { symbol: '₾', locale: 'ka-GE' },
};

const MULTIPLIERS = {
  regular: 1.0,
  night: 1.4,
  holiday: 1.25,
  holidayNight: 1.5,
  overtime: 2.0,
  overtimeNight: 2.4,
};

const CATEGORIES = [
  { key: 'regular', label: 'Regular', multiplier: MULTIPLIERS.regular, cssClass: 'regular' },
  { key: 'night', label: 'Night', multiplier: MULTIPLIERS.night, cssClass: 'night', inputId: 'nightHours' },
  { key: 'holiday', label: 'Holiday', multiplier: MULTIPLIERS.holiday, cssClass: 'holiday', inputId: 'holidayHours' },
  { key: 'holidayNight', label: 'Holiday Night', multiplier: MULTIPLIERS.holidayNight, cssClass: 'holiday-night', inputId: 'holidayNightHours' },
  { key: 'overtime', label: 'Overtime', multiplier: MULTIPLIERS.overtime, cssClass: 'overtime', inputId: 'overtimeHours' },
  { key: 'overtimeNight', label: 'Overtime Night', multiplier: MULTIPLIERS.overtimeNight, cssClass: 'overtime-night', inputId: 'overtimeNightHours' },
];

const DEFAULTS = {
  hourlyRate: 9.125,
  totalHours: '',
  standardHours: 176,
  taxPercent: '',
  nightHours: '',
  holidayHours: '',
  holidayNightHours: '',
  overtimeHours: '',
  overtimeNightHours: '',
};

let state = {
  currency: 'GEL',
  theme: 'light',
  ...DEFAULTS,
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function parseNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(amount) {
  const { symbol, locale } = CURRENCIES[state.currency];
  const formatted = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

function formatHours(hours) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function animateValue(el, newValue, formatter) {
  const oldValue = parseFloat(el.dataset.value || '0');
  el.dataset.value = String(newValue);

  if (oldValue === newValue) {
    el.textContent = formatter(newValue);
    return;
  }

  el.classList.add('is-updating');
  el.textContent = formatter(newValue);

  clearTimeout(el._animTimer);
  el._animTimer = setTimeout(() => el.classList.remove('is-updating'), 350);
}

function getInputs() {
  return {
    hourlyRate: parseNum(els.hourlyRate.value),
    totalHours: parseNum(els.totalHours.value),
    standardHours: parseNum(els.standardHours.value),
    taxPercent: parseNum(els.taxPercent.value),
    nightHours: parseNum(els.nightHours.value),
    holidayHours: parseNum(els.holidayHours.value),
    holidayNightHours: parseNum(els.holidayNightHours.value),
    overtimeHours: parseNum(els.overtimeHours.value),
    overtimeNightHours: parseNum(els.overtimeNightHours.value),
  };
}

function validate(inputs) {
  const errors = {};
  let hoursWarning = null;

  if (inputs.hourlyRate < 0) {
    errors.hourlyRate = 'Hourly rate cannot be negative.';
  }

  if (inputs.totalHours < 0) {
    errors.totalHours = 'Total hours cannot be negative.';
  }

  if (inputs.standardHours <= 0) {
    errors.standardHours = 'Standard hours must be greater than 0.';
  }

  if (inputs.taxPercent < 0 || inputs.taxPercent > 100) {
    errors.taxPercent = 'Tax must be between 0% and 100%.';
  }

  const specialKeys = ['nightHours', 'holidayHours', 'holidayNightHours', 'overtimeHours', 'overtimeNightHours'];
  for (const key of specialKeys) {
    if (inputs[key] < 0) {
      errors[key] = 'Hours cannot be negative.';
    }
  }

  const specialSum =
    inputs.nightHours +
    inputs.holidayHours +
    inputs.holidayNightHours +
    inputs.overtimeHours +
    inputs.overtimeNightHours;

  if (specialSum > inputs.totalHours) {
    hoursWarning = `Special hours (${formatHours(specialSum)}) exceed total worked hours (${formatHours(inputs.totalHours)}). Reduce category hours or increase total hours.`;
  }

  const regularHours = inputs.totalHours - specialSum;
  if (regularHours < 0) {
    hoursWarning = hoursWarning || 'Regular hours cannot be negative.';
  }

  return { errors, hoursWarning, specialSum, regularHours, isValid: Object.keys(errors).length === 0 && regularHours >= 0 && specialSum <= inputs.totalHours };
}

function calculate(inputs) {
  const specialSum =
    inputs.nightHours +
    inputs.holidayHours +
    inputs.holidayNightHours +
    inputs.overtimeHours +
    inputs.overtimeNightHours;

  const hours = {
    regular: Math.max(0, inputs.totalHours - specialSum),
    night: inputs.nightHours,
    holiday: inputs.holidayHours,
    holidayNight: inputs.holidayNightHours,
    overtime: inputs.overtimeHours,
    overtimeNight: inputs.overtimeNightHours,
  };

  const rate = inputs.hourlyRate;

  const pay = {
    regular: hours.regular * rate * MULTIPLIERS.regular,
    night: hours.night * rate * MULTIPLIERS.night,
    holiday: hours.holiday * rate * MULTIPLIERS.holiday,
    holidayNight: hours.holidayNight * rate * MULTIPLIERS.holidayNight,
    overtime: hours.overtime * rate * MULTIPLIERS.overtime,
    overtimeNight: hours.overtimeNight * rate * MULTIPLIERS.overtimeNight,
  };

  const grossSalary = Object.values(pay).reduce((sum, v) => sum + v, 0);
  const taxAmount = grossSalary * (inputs.taxPercent / 100);
  const netSalary = grossSalary - taxAmount;

  return { hours, pay, grossSalary, taxAmount, netSalary, specialSum };
}

function showFieldError(fieldId, message) {
  const errorEl = $(`${fieldId}Error`);
  const inputEl = $(fieldId);
  if (!errorEl || !inputEl) return;

  errorEl.textContent = message || '';
  const wrap = inputEl.closest('.input-wrap');
  if (wrap) wrap.classList.toggle('is-invalid', Boolean(message));
}

function clearAllErrors() {
  ['hourlyRate', 'totalHours', 'standardHours', 'taxPercent'].forEach((id) => showFieldError(id, ''));
}

function renderBreakdown(result, isValid) {
  const hoursMap = {
    regular: result.hours.regular,
    night: result.hours.night,
    holiday: result.hours.holiday,
    holidayNight: result.hours.holidayNight,
    overtime: result.hours.overtime,
    overtimeNight: result.hours.overtimeNight,
  };

  const payMap = {
    regular: result.pay.regular,
    night: result.pay.night,
    holiday: result.pay.holiday,
    holidayNight: result.pay.holidayNight,
    overtime: result.pay.overtime,
    overtimeNight: result.pay.overtimeNight,
  };

  els.hoursBreakdown.innerHTML = CATEGORIES.map((cat) => {
    const hrs = hoursMap[cat.key];
    const mult = cat.multiplier === 1 ? '1.00×' : `${cat.multiplier.toFixed(2)}×`;
    return `
      <div class="breakdown-row breakdown-row--${cat.cssClass}${isValid ? '' : ' is-invalid'}">
        <span class="breakdown-row__label">
          <span class="breakdown-row__dot"></span>
          ${cat.label}
          <span class="breakdown-row__hours">${formatHours(hrs)} hrs · ${mult}</span>
        </span>
        <span class="breakdown-row__value">${formatHours(hrs)}</span>
      </div>`;
  }).join('');

  els.payBreakdown.innerHTML = CATEGORIES.map((cat) => {
    const pay = payMap[cat.key];
    const hrs = hoursMap[cat.key];
    return `
      <div class="breakdown-row breakdown-row--${cat.cssClass}${isValid ? '' : ' is-invalid'}">
        <span class="breakdown-row__label">
          <span class="breakdown-row__dot"></span>
          ${cat.label} Pay
          <span class="breakdown-row__hours">${formatHours(hrs)} hrs</span>
        </span>
        <span class="breakdown-row__value">${formatMoney(pay)}</span>
      </div>`;
  }).join('');

  els.regularHoursPill.textContent = `${formatHours(result.hours.regular)} regular hrs`;
}

function updateUI() {
  const inputs = getInputs();
  const { errors, hoursWarning, isValid } = validate(inputs);
  const result = calculate(inputs);

  clearAllErrors();
  Object.entries(errors).forEach(([field, msg]) => showFieldError(field, msg));

  if (hoursWarning) {
    els.hoursWarning.hidden = false;
    els.hoursWarningText.textContent = hoursWarning;
  } else {
    els.hoursWarning.hidden = true;
  }

  const displayGross = isValid ? result.grossSalary : 0;
  const displayNet = isValid ? result.netSalary : 0;
  const displayTax = isValid ? result.taxAmount : 0;

  animateValue(els.grossSalary, displayGross, formatMoney);
  animateValue(els.netSalary, displayNet, formatMoney);
  animateValue(els.grossTotal, displayGross, formatMoney);

  els.taxDeduction.textContent = `Tax (${inputs.taxPercent}%): ${formatMoney(displayTax)}`;

  renderBreakdown(result, isValid);

  Object.assign(state, inputs);
}

function updateCurrencySymbols() {
  const symbol = CURRENCIES[state.currency].symbol;
  document.querySelectorAll('.currency-symbol').forEach((el) => {
    el.textContent = symbol;
  });
}

function setCurrency(code) {
  state.currency = code;
  document.querySelectorAll('.currency-btn').forEach((btn) => {
    const active = btn.dataset.currency === code;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  updateCurrencySymbols();
  updateUI();
  localStorage.setItem('salary-calc-currency', code);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('salary-calc-theme', theme);
}

function toggleTheme() {
  setTheme(state.theme === 'light' ? 'dark' : 'light');
}

function resetForm() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    const id = key;
    const el = $(id);
    if (el) el.value = value;
  });
  updateUI();
  showToast('Form reset to defaults');
}

function buildCopyText(inputs, result) {
  const { isValid } = validate(inputs);
  if (!isValid) return 'Invalid input — please fix errors before copying.';

  const sym = CURRENCIES[state.currency].symbol;
  const lines = [
    '── Salary Calculator Results ──',
    '',
    'INPUTS',
    `Hourly Rate: ${sym}${inputs.hourlyRate}`,
    `Total Worked Hours: ${formatHours(inputs.totalHours)}`,
    `Standard Monthly Hours: ${formatHours(inputs.standardHours)}`,
    `Income Tax: ${inputs.taxPercent}%`,
    '',
    'HOURS BREAKDOWN',
    `Regular: ${formatHours(result.hours.regular)} hrs`,
    `Night: ${formatHours(result.hours.night)} hrs`,
    `Holiday: ${formatHours(result.hours.holiday)} hrs`,
    `Holiday Night: ${formatHours(result.hours.holidayNight)} hrs`,
    `Overtime: ${formatHours(result.hours.overtime)} hrs`,
    `Overtime Night: ${formatHours(result.hours.overtimeNight)} hrs`,
    '',
    'PAYMENT BREAKDOWN',
    `Regular Pay: ${formatMoney(result.pay.regular)}`,
    `Night Pay: ${formatMoney(result.pay.night)}`,
    `Holiday Pay: ${formatMoney(result.pay.holiday)}`,
    `Holiday Night Pay: ${formatMoney(result.pay.holidayNight)}`,
    `Overtime Pay: ${formatMoney(result.pay.overtime)}`,
    `Overtime Night Pay: ${formatMoney(result.pay.overtimeNight)}`,
    '',
    'SUMMARY',
    `Gross Salary: ${formatMoney(result.grossSalary)}`,
    `Tax (${inputs.taxPercent}%): ${formatMoney(result.taxAmount)}`,
    `Net Salary: ${formatMoney(result.netSalary)}`,
  ];
  return lines.join('\n');
}

async function copyResults() {
  const inputs = getInputs();
  const result = calculate(inputs);
  const text = buildCopyText(inputs, result);

  try {
    await navigator.clipboard.writeText(text);
    els.copyBtnText.textContent = 'Copied!';
    showToast('Results copied to clipboard');
    setTimeout(() => {
      els.copyBtnText.textContent = 'Copy Results';
    }, 2000);
  } catch {
    showToast('Could not copy — please try again');
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(els.toast._timer);
  els.toast._timer = setTimeout(() => els.toast.classList.remove('is-visible'), 2500);
}

function bindElements() {
  els.hourlyRate = $('hourlyRate');
  els.totalHours = $('totalHours');
  els.standardHours = $('standardHours');
  els.taxPercent = $('taxPercent');
  els.nightHours = $('nightHours');
  els.holidayHours = $('holidayHours');
  els.holidayNightHours = $('holidayNightHours');
  els.overtimeHours = $('overtimeHours');
  els.overtimeNightHours = $('overtimeNightHours');
  els.hoursWarning = $('hoursWarning');
  els.hoursWarningText = $('hoursWarningText');
  els.grossSalary = $('grossSalary');
  els.netSalary = $('netSalary');
  els.taxDeduction = $('taxDeduction');
  els.grossTotal = $('grossTotal');
  els.regularHoursPill = $('regularHoursPill');
  els.hoursBreakdown = $('hoursBreakdown');
  els.payBreakdown = $('payBreakdown');
  els.copyBtn = $('copyBtn');
  els.copyBtnText = $('copyBtnText');
  els.resetBtn = $('resetBtn');
  els.themeToggle = $('themeToggle');
  els.toast = $('toast');
}

function bindEvents() {
  const inputIds = [
    'hourlyRate', 'totalHours', 'standardHours', 'taxPercent',
    'nightHours', 'holidayHours', 'holidayNightHours', 'overtimeHours', 'overtimeNightHours',
  ];

  inputIds.forEach((id) => {
    $(id).addEventListener('input', updateUI);
  });

  document.querySelectorAll('.currency-btn').forEach((btn) => {
    btn.addEventListener('click', () => setCurrency(btn.dataset.currency));
  });

  els.resetBtn.addEventListener('click', resetForm);
  els.copyBtn.addEventListener('click', copyResults);
  els.themeToggle.addEventListener('click', toggleTheme);
}

function loadPreferences() {
  const savedTheme = localStorage.getItem('salary-calc-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    setTheme(savedTheme);
  }

  const savedCurrency = localStorage.getItem('salary-calc-currency');
  if (savedCurrency && CURRENCIES[savedCurrency]) {
    setCurrency(savedCurrency);
  }
}

function init() {
  bindElements();
  bindEvents();
  loadPreferences();
  updateCurrencySymbols();
  updateUI();
}

document.addEventListener('DOMContentLoaded', init);
