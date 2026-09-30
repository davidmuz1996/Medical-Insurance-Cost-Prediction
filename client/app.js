'use strict';

const API_URL = '';

const el = {
  form: document.getElementById('estimator'),
  age: document.getElementById('age'),
  ageHint: document.getElementById('age-hint'),
  height: document.getElementById('height'),
  weight: document.getElementById('weight'),
  heightLabel: document.getElementById('height-label'),
  weightLabel: document.getElementById('weight-label'),
  bmiValue: document.getElementById('bmi-value'),
  bmiHint: document.getElementById('bmi-hint'),
  submit: document.getElementById('submit-btn'),
  error: document.getElementById('form-error'),
  result: document.getElementById('result'),
  amount: document.getElementById('result-amount'),
  aboutAge: document.getElementById('about-age'),
  aboutBmi: document.getElementById('about-bmi'),
};

const UNITS = {
  metric: { height: 'Height (cm)', weight: 'Weight (kg)', heightHint: 'e.g. 175', weightHint: 'e.g. 70' },
  imperial: { height: 'Height (in)', weight: 'Weight (lb)', heightHint: 'e.g. 69', weightHint: 'e.g. 154' },
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let limits = null;          // filled from /options
let currentUnits = 'metric';

const checked = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
}

function clearError() {
  el.error.hidden = true;
  el.error.textContent = '';
}

// ---------- BMI and units ----------

function computeBmi() {
  const height = parseFloat(el.height.value);
  const weight = parseFloat(el.weight.value);
  if (!(height > 0) || !(weight > 0)) return null;

  const bmi = checked('units') === 'metric'
    ? weight / (height / 100) ** 2   // kg, cm
    : (703 * weight) / height ** 2;  // lb, in
  return Math.round(bmi * 100) / 100;
}

function updateBmi() {
  const bmi = computeBmi();
  el.bmiValue.textContent = bmi === null ? '—' : bmi.toFixed(1);
  el.bmiHint.classList.remove('warn');
  el.bmiHint.textContent = '';
  if (!limits) return;

  const range = `${limits.bmi.min}–${limits.bmi.max}`;
  if (bmi !== null && (bmi < limits.bmi.min || bmi > limits.bmi.max)) {
    el.bmiHint.textContent = `outside the supported range (${range})`;
    el.bmiHint.classList.add('warn');
  } else {
    el.bmiHint.textContent = `supported range: ${range}`;
  }
}

function convertValue(input, factor) {
  const value = parseFloat(input.value);
  if (value > 0) input.value = (value * factor).toFixed(1);
}

function switchUnits(newUnits) {
  if (newUnits === currentUnits) return;

  const toImperial = newUnits === 'imperial';
  convertValue(el.height, toImperial ? 1 / 2.54 : 2.54);
  convertValue(el.weight, toImperial ? 2.20462 : 1 / 2.20462);
  currentUnits = newUnits;

  el.heightLabel.textContent = UNITS[newUnits].height;
  el.weightLabel.textContent = UNITS[newUnits].weight;
  el.height.placeholder = UNITS[newUnits].heightHint;
  el.weight.placeholder = UNITS[newUnits].weightHint;
  updateBmi();
}

// ---------- Load the limits from the API ----------

async function loadOptions() {
  try {
    const response = await fetch(`${API_URL}/options`);
    if (!response.ok) throw new Error('options request failed');
    limits = await response.json();
  } catch {
    showError("Can't reach the server. Make sure the API is running, then reload the page.");
    return;
  }

  const ageRange = `${limits.age.min}–${limits.age.max}`;
  const bmiRange = `${limits.bmi.min}–${limits.bmi.max}`;
  el.age.min = limits.age.min;
  el.age.max = limits.age.max;
  el.ageHint.textContent = `${ageRange} years`;
  el.aboutAge.textContent = ageRange;
  el.aboutBmi.textContent = bmiRange;
  updateBmi();
}

// ---------- Validate and send ----------

function buildPayload() {
  const age = Number(el.age.value);
  const sex = checked('sex');
  const smoker = checked('smoker');
  const bmi = computeBmi();

  if (el.age.value === '' || !Number.isInteger(age)) {
    return { error: 'Enter your age as a whole number.' };
  }
  if (limits && (age < limits.age.min || age > limits.age.max)) {
    return { error: `Age must be between ${limits.age.min} and ${limits.age.max}.` };
  }
  if (!sex) return { error: 'Select your sex.' };
  if (bmi === null) return { error: 'Enter your height and weight.' };
  if (limits && (bmi < limits.bmi.min || bmi > limits.bmi.max)) {
    return {
      error: `Your BMI (${bmi.toFixed(1)}) is outside the supported range (${limits.bmi.min}–${limits.bmi.max}).`,
    };
  }
  if (!smoker) return { error: 'Select whether you smoke.' };

  return { payload: { age, sex, bmi, smoker } };
}

async function handleSubmit(event) {
  event.preventDefault();
  clearError();
  el.result.hidden = true;

  const { error, payload } = buildPayload();
  if (error) {
    showError(error);
    return;
  }

  el.submit.disabled = true;
  el.submit.textContent = 'Estimating…';

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      showError(
        response.status === 422
          ? 'The server rejected these values. Please check your inputs.'
          : 'Something went wrong on the server. Please try again.'
      );
      return;
    }

    const data = await response.json();
    el.amount.textContent = money.format(data.estimated_charges);
    el.result.hidden = false;
  } catch {
    showError("Can't reach the server. Make sure the API is running.");
  } finally {
    el.submit.disabled = false;
    el.submit.textContent = 'Estimate charges';
  }
}

// ---------- Wire everything up ----------

el.form.addEventListener('submit', handleSubmit);
el.height.addEventListener('input', updateBmi);
el.weight.addEventListener('input', updateBmi);
document.querySelectorAll('input[name="units"]').forEach((radio) => {
  radio.addEventListener('change', () => switchUnits(radio.value));
});

loadOptions();