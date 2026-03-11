'use strict';

const QUESTIONNAIRE = {
  steps: [
    {
      id: 'gpa',
      title: 'What is your current GPA?',
      hint: 'Use your unweighted GPA on a 4.0 scale.',
      type: 'slider',
      min: 1.0,
      max: 4.0,
      step: 0.1,
      default: 3.5,
      format: v => parseFloat(v).toFixed(1),
    },
    {
      id: 'sat',
      title: 'What is your SAT score?',
      hint: 'Drag the slider for your composite SAT score (400–1600).',
      type: 'slider_optional',
      sliderKey: 'sat',
      optionalKey: 'act',
      min: 400,
      max: 1600,
      step: 10,
      default: 1100,
      optionalLabel: 'I have an ACT score instead',
      optionalMin: 1,
      optionalMax: 36,
      optionalPlaceholder: 'ACT (1–36)',
      format: v => parseInt(v).toLocaleString(),
    },
    {
      id: 'major',
      title: 'What do you want to study?',
      hint: 'Choose the field closest to your intended major.',
      type: 'dropdown',
      placeholder: '— Select a field —',
    },
    {
      id: 'regions',
      title: 'Which regions do you prefer?',
      hint: 'Select all that apply. Choosing "No Preference" overrides the others.',
      type: 'chips',
      options: [
        { value: 'northeast',    label: 'Northeast' },
        { value: 'southeast',    label: 'Southeast' },
        { value: 'midwest',      label: 'Midwest' },
        { value: 'southwest',    label: 'Southwest' },
        { value: 'west',         label: 'West' },
        { value: 'no_preference',label: 'No Preference' },
      ],
    },
    {
      id: 'setting',
      title: 'What campus setting do you prefer?',
      hint: 'Think about where you see yourself living and studying.',
      type: 'radio',
      options: [
        { value: 'urban',         label: 'Urban',    icon: '🏙' },
        { value: 'suburban',      label: 'Suburban', icon: '🏘' },
        { value: 'rural',         label: 'Rural',    icon: '🌲' },
        { value: 'no_preference', label: 'No Preference', icon: '🔀' },
      ],
    },
    {
      id: 'climate',
      title: 'What climate do you prefer?',
      hint: 'Consider the weather you enjoy for daily life.',
      type: 'radio',
      options: [
        { value: 'warm',          label: 'Warm',     icon: '☀️' },
        { value: 'cold',          label: 'Cold',     icon: '❄️' },
        { value: 'moderate',      label: 'Moderate', icon: '🌤' },
        { value: 'no_preference', label: 'No Preference', icon: '🔀' },
      ],
    },
    {
      id: 'size',
      title: 'What school size do you prefer?',
      hint: 'School size affects class sizes, resources, and community feel.',
      type: 'radio',
      options: [
        { value: 'small',         label: 'Small',   icon: '🏫', desc: '< 5,000 students' },
        { value: 'medium',        label: 'Medium',  icon: '🎓', desc: '5k – 15k students' },
        { value: 'large',         label: 'Large',   icon: '🏛', desc: '> 15,000 students' },
        { value: 'no_preference', label: 'No Preference', icon: '🔀', desc: 'Any size' },
      ],
    },
    {
      id: 'type',
      title: 'Public or private school?',
      hint: 'Public schools are often more affordable; private schools may offer more aid.',
      type: 'radio',
      options: [
        { value: 'public',        label: 'Public',  icon: '🏛' },
        { value: 'private',       label: 'Private', icon: '🎓' },
        { value: 'no_preference', label: 'No Preference', icon: '🔀' },
      ],
    },
    {
      id: 'count',
      title: 'How many colleges would you like to see?',
      hint: 'We\'ll show up to this many matches.',
      type: 'number',
      min: 5,
      max: 20,
      default: 10,
    },
    {
      id: 'tier',
      title: 'What type of schools are you looking for?',
      hint: 'Based on your GPA and SAT, we\'ll find matching colleges in your chosen tier.',
      type: 'radio',
      options: [
        { value: 'safety',  label: 'Safety Schools',  icon: '✅', desc: 'Very likely to get in' },
        { value: 'target',  label: 'Target Schools',  icon: '🎯', desc: 'Good chance of admission' },
        { value: 'reach',   label: 'Reach Schools',   icon: '🚀', desc: 'Challenging, but possible' },
      ],
    },
  ],

  render(container, currentStep, formData, majors) {
    const step = this.steps[currentStep];
    const total = this.steps.length;

    const pct = Math.round(((currentStep) / total) * 100);

    container.innerHTML = `
      <div class="questionnaire-wrapper">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">Step ${currentStep + 1} of ${total}</div>
        <div class="step active" id="step-${step.id}">
          <h2>${step.title}</h2>
          <p class="step-hint">${step.hint}</p>
          ${this._renderInput(step, formData, majors)}
          <div class="step-nav">
            ${currentStep > 0
              ? `<button class="btn-back" id="btnBack">← Back</button>`
              : `<span></span>`}
            <button class="btn-primary" id="btnNext">
              ${currentStep === total - 1 ? 'Find My Colleges →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    `;

    this._attachInputListeners(step, container, formData);
  },

  _renderInput(step, formData, majors) {
    switch (step.type) {
      case 'slider': {
        const val = formData[step.id] !== undefined ? formData[step.id] : step.default;
        return `
          <div class="slider-wrap">
            <input type="range" id="input-${step.id}"
              min="${step.min}" max="${step.max}" step="${step.step}"
              value="${val}" />
            <span class="slider-value" id="val-${step.id}">${step.format(val)}</span>
          </div>`;
      }

      case 'slider_optional': {
        const val = formData[step.sliderKey] !== undefined ? formData[step.sliderKey] : step.default;
        const actChecked = formData._showAct ? 'checked' : '';
        const actVal = formData[step.optionalKey] || '';
        return `
          <div class="slider-wrap">
            <input type="range" id="input-sat"
              min="${step.min}" max="${step.max}" step="${step.step}"
              value="${val}" />
            <span class="slider-value" id="val-sat">${step.format(val)}</span>
          </div>
          <label class="optional-toggle">
            <input type="checkbox" id="chk-act" ${actChecked} />
            ${step.optionalLabel}
          </label>
          <div class="optional-input-wrap ${actChecked ? 'visible' : ''}" id="act-wrap">
            <input type="number" id="input-act"
              min="${step.optionalMin}" max="${step.optionalMax}"
              placeholder="${step.optionalPlaceholder}"
              value="${actVal}" />
          </div>`;
      }

      case 'dropdown': {
        const selected = formData[step.id] || '';
        const options = majors.map(m =>
          `<option value="${m}" ${m === selected ? 'selected' : ''}>${_formatMajorLabel(m)}</option>`
        ).join('');
        return `
          <select class="styled-select" id="input-${step.id}">
            <option value="">${step.placeholder}</option>
            ${options}
          </select>`;
      }

      case 'chips': {
        const selected = formData[step.id] || [];
        return `
          <div class="chips-wrap" id="chips-${step.id}">
            ${step.options.map(o => `
              <div class="chip ${selected.includes(o.value) ? 'selected' : ''}"
                   data-value="${o.value}">${o.label}</div>
            `).join('')}
          </div>`;
      }

      case 'radio': {
        const selected = formData[step.id] || '';
        return `
          <div class="radio-cards" id="radio-${step.id}">
            ${step.options.map(o => `
              <div class="radio-card ${selected === o.value ? 'selected' : ''}"
                   data-value="${o.value}">
                ${o.icon ? `<span class="radio-icon">${o.icon}</span>` : ''}
                <div>
                  <div>${o.label}</div>
                  ${o.desc ? `<div style="font-size:0.75rem;opacity:0.7;margin-top:2px">${o.desc}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>`;
      }

      case 'number': {
        const val = formData[step.id] !== undefined ? formData[step.id] : step.default;
        return `
          <div class="count-wrap">
            <input type="number" id="input-${step.id}"
              min="${step.min}" max="${step.max}" value="${val}" />
            <span class="count-hint">colleges (${step.min}–${step.max})</span>
          </div>`;
      }

      default: return '';
    }
  },

  _attachInputListeners(step, container, formData) {
    switch (step.type) {
      case 'slider': {
        const slider = container.querySelector(`#input-${step.id}`);
        const display = container.querySelector(`#val-${step.id}`);
        if (slider) {
          slider.addEventListener('input', () => {
            formData[step.id] = parseFloat(slider.value);
            display.textContent = step.format(slider.value);
          });
          // Set initial value in formData
          if (formData[step.id] === undefined) formData[step.id] = step.default;
        }
        break;
      }

      case 'slider_optional': {
        const slider = container.querySelector('#input-sat');
        const display = container.querySelector('#val-sat');
        const chk = container.querySelector('#chk-act');
        const actWrap = container.querySelector('#act-wrap');
        const actInput = container.querySelector('#input-act');

        if (formData.sat === undefined) formData.sat = step.default;

        if (slider) {
          slider.addEventListener('input', () => {
            formData.sat = parseInt(slider.value);
            display.textContent = step.format(slider.value);
          });
        }
        if (chk) {
          chk.addEventListener('change', () => {
            formData._showAct = chk.checked;
            actWrap.classList.toggle('visible', chk.checked);
          });
        }
        if (actInput) {
          actInput.addEventListener('input', () => {
            formData.act = parseInt(actInput.value) || null;
          });
        }
        break;
      }

      case 'dropdown': {
        const sel = container.querySelector(`#input-${step.id}`);
        if (sel) {
          sel.addEventListener('change', () => {
            formData[step.id] = sel.value;
          });
        }
        break;
      }

      case 'chips': {
        const wrap = container.querySelector(`#chips-${step.id}`);
        if (!wrap) break;
        wrap.querySelectorAll('.chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const val = chip.dataset.value;
            if (!formData[step.id]) formData[step.id] = [];

            if (val === 'no_preference') {
              // Toggle no_preference exclusively
              if (formData[step.id].includes('no_preference')) {
                formData[step.id] = [];
              } else {
                formData[step.id] = ['no_preference'];
              }
            } else {
              // Remove no_preference if adding a real region
              formData[step.id] = formData[step.id].filter(v => v !== 'no_preference');
              const idx = formData[step.id].indexOf(val);
              if (idx >= 0) {
                formData[step.id].splice(idx, 1);
              } else {
                formData[step.id].push(val);
              }
            }

            // Re-render chips
            wrap.querySelectorAll('.chip').forEach(c => {
              c.classList.toggle('selected', formData[step.id].includes(c.dataset.value));
            });
          });
        });
        break;
      }

      case 'radio': {
        const wrap = container.querySelector(`#radio-${step.id}`);
        if (!wrap) break;
        wrap.querySelectorAll('.radio-card').forEach(card => {
          card.addEventListener('click', () => {
            formData[step.id] = card.dataset.value;
            wrap.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
          });
        });
        break;
      }

      case 'number': {
        const inp = container.querySelector(`#input-${step.id}`);
        if (inp) {
          inp.addEventListener('input', () => {
            formData[step.id] = parseInt(inp.value) || step.default;
          });
          if (formData[step.id] === undefined) formData[step.id] = step.default;
        }
        break;
      }
    }
  },

  validate(step, formData) {
    switch (step.type) {
      case 'dropdown':
        if (!formData[step.id]) return 'Please select a field of study.';
        break;
      case 'chips':
        if (!formData[step.id] || formData[step.id].length === 0)
          return 'Please select at least one region.';
        break;
      case 'radio':
        if (!formData[step.id]) return 'Please select an option.';
        break;
      case 'number': {
        const v = parseInt(formData[step.id]);
        if (isNaN(v) || v < step.min || v > step.max)
          return `Please enter a number between ${step.min} and ${step.max}.`;
        break;
      }
    }
    return null;
  },
};

function _formatMajorLabel(key) {
  const map = {
    computer_science:       'Computer Science',
    biology:                'Biology',
    chemistry:              'Chemistry',
    physics:                'Physics',
    mathematics:            'Mathematics',
    statistics:             'Statistics',
    mechanical_engineering: 'Mechanical Engineering',
    electrical_engineering: 'Electrical Engineering',
    biomedical_engineering: 'Biomedical Engineering',
    aerospace_engineering:  'Aerospace Engineering',
    civil_engineering:      'Civil Engineering',
    architecture:           'Architecture',
    political_science:      'Political Science',
    economics:              'Economics',
    psychology:             'Psychology',
    sociology:              'Sociology',
    anthropology:           'Anthropology',
    philosophy:             'Philosophy',
    history:                'History',
    english:                'English / Literature',
    communications:         'Communications',
    journalism:             'Journalism',
    film:                   'Film & Media',
    music:                  'Music',
    fine_arts:              'Fine Arts / Design',
    business:               'Business / Finance',
    nursing:                'Nursing',
    pre_med:                'Pre-Med / Health Sciences',
    pre_law:                'Pre-Law',
    neuroscience:           'Neuroscience',
    environmental_science:  'Environmental Science',
    international_relations:'International Relations',
    criminal_justice:       'Criminal Justice',
    education:              'Education',
    agriculture:            'Agriculture',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
