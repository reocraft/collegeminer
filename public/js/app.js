'use strict';

// ===== STATE =====
const State = {
  view: 'home',        // 'home' | 'questionnaire' | 'results' | 'saved'
  currentStep: 0,
  formData: {},
  results: [],
  majors: [],
};

// ===== DOM =====
const app = document.getElementById('app');
const navQuestionnaire = document.getElementById('navQuestionnaire');
const navSaved = document.getElementById('navSaved');
const logoLink = document.getElementById('logoLink');
const savedBadge = document.getElementById('savedBadge');

// ===== INIT =====
async function init() {
  updateBadge();
  await loadMajors();
  renderView('home');

  navQuestionnaire.addEventListener('click', () => {
    State.currentStep = 0;
    State.formData = {};
    renderView('questionnaire');
  });

  navSaved.addEventListener('click', () => renderView('saved'));
  logoLink.addEventListener('click', e => {
    e.preventDefault();
    renderView('home');
  });
}

async function loadMajors() {
  try {
    const resp = await fetch('/api/majors');
    State.majors = await resp.json();
  } catch {
    State.majors = ['stem', 'engineering', 'business', 'humanities', 'arts',
                    'health', 'law', 'education', 'social_sciences', 'agriculture'];
  }
}

// ===== VIEWS =====
function renderView(view) {
  State.view = view;
  app.classList.remove('home-view');

  switch (view) {
    case 'home':        renderHome(); break;
    case 'questionnaire': renderQuestionnaire(); break;
    case 'results':     renderResults(); break;
    case 'saved':       renderSaved(); break;
  }
}

function renderHome() {
  app.classList.add('home-view');
  app.innerHTML = `
    <section class="home-hero">
      <div class="home-hero-inner">
        <div class="home-hero-tag">Smart College Matching</div>
        <h1>Find Your <span>Perfect College</span></h1>
        <p>Answer a few questions about your GPA, test scores, and preferences. We'll match you with colleges that truly fit — and explain exactly why.</p>
        <div class="home-hero-cta">
          <span class="home-hero-note">Free · Takes ~3 minutes</span>
          <button class="btn-primary btn-lg" id="btnStart">Get Started →</button>
        </div>
      </div>
    </section>

    <section class="home-features">
      <div class="home-features-inner">
        <h2 class="section-title">How CollegeMiner Works</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📋</div>
            <h3>Tell Us About You</h3>
            <p>Share your GPA, test scores, preferred location, major interests, and campus vibe. No account needed.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚙️</div>
            <h3>Smart Matching</h3>
            <p>Our algorithm scores every college against your profile — weighing academics, location, size, and more.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎓</div>
            <h3>See Your Fit List</h3>
            <p>Get a personalized list of Safety, Target, and Reach schools with clear reasons why each one fits.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="home-stats">
      <div class="home-stats-inner">
        <div class="stat-block">
          <div class="stat-num">1,000+</div>
          <div class="stat-desc">US Colleges</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <div class="stat-num">3</div>
          <div class="stat-desc">Minutes to Match</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <div class="stat-num">100%</div>
          <div class="stat-desc">Free to Use</div>
        </div>
      </div>
    </section>

    <section class="home-bottom-cta">
      <div class="home-bottom-cta-inner">
        <h2>Ready to find your fit?</h2>
        <p>Your dream school is out there. Let's find it together.</p>
        <button class="btn-primary btn-lg" id="btnStart2">Start Matching →</button>
      </div>
    </section>
  `;
  const startHandler = () => {
    State.currentStep = 0;
    State.formData = {};
    renderView('questionnaire');
  };
  app.querySelector('#btnStart').addEventListener('click', startHandler);
  const btn2 = app.querySelector('#btnStart2');
  if (btn2) btn2.addEventListener('click', startHandler);
}

function renderQuestionnaire() {
  QUESTIONNAIRE.render(app, State.currentStep, State.formData, State.majors);
  attachQuestionnaireHandlers();
}

function attachQuestionnaireHandlers() {
  const btnNext = app.querySelector('#btnNext');
  const btnBack = app.querySelector('#btnBack');

  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      const step = QUESTIONNAIRE.steps[State.currentStep];

      // Convert ACT to SAT if provided
      if (step.id === 'sat' && State.formData._showAct && State.formData.act) {
        State.formData.sat = actToSat(State.formData.act);
      }

      const err = QUESTIONNAIRE.validate(step, State.formData);
      if (err) {
        showValidationError(err);
        return;
      }

      if (State.currentStep < QUESTIONNAIRE.steps.length - 1) {
        State.currentStep++;
        renderQuestionnaire();
      } else {
        // Submit
        await submitQuestionnaire();
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      State.currentStep--;
      renderQuestionnaire();
      // Add back animation
      const stepEl = app.querySelector('.step.active');
      if (stepEl) {
        stepEl.classList.add('slide-back');
      }
    });
  }
}

async function submitQuestionnaire() {
  // Show loading
  app.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Finding your perfect colleges...</p>
    </div>`;

  try {
    const payload = buildPayload(State.formData);
    const resp = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

    State.results = await resp.json();
    renderView('results');
  } catch (err) {
    app.innerHTML = `
      <div class="no-results">
        <div style="font-size:3rem;margin-bottom:12px">⚠️</div>
        <h3>Something went wrong</h3>
        <p>${err.message}</p>
        <button class="btn-primary" id="btnRetry">Try Again</button>
      </div>`;
    app.querySelector('#btnRetry').addEventListener('click', () => {
      State.currentStep = 0;
      State.formData = {};
      renderView('questionnaire');
    });
  }
}

function buildPayload(formData) {
  return {
    gpa:     parseFloat(formData.gpa)   || 3.0,
    sat:     parseInt(formData.sat)     || 1000,
    major:   formData.major             || '',
    regions: formData.regions           || ['no_preference'],
    setting: formData.setting           || 'no_preference',
    climate: formData.climate           || 'no_preference',
    size:    formData.size              || 'no_preference',
    type:    formData.type              || 'no_preference',
    count:   parseInt(formData.count)   || 10,
    tier:    formData.tier              || 'target',
  };
}

function renderResults() {
  const savedIds = SAVED.getSavedIds();
  RESULTS.render(app, State.results, savedIds);
  attachResultHandlers();
}

function attachResultHandlers() {
  const newSearchBtn = app.querySelector('#btnNewSearch');
  if (newSearchBtn) {
    newSearchBtn.addEventListener('click', () => {
      State.currentStep = 0;
      State.formData = {};
      renderView('questionnaire');
    });
  }

  const retryBtn = app.querySelector('#btnRetry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      State.currentStep = 0;
      State.formData = {};
      renderView('questionnaire');
    });
  }

  // Save button delegation
  app.addEventListener('click', handleSaveClick);
}

function handleSaveClick(e) {
  const btn = e.target.closest('[data-action="save"]');
  if (!btn) return;

  const id = btn.dataset.id;
  const college = State.results.find(c => c.id === id);
  if (!college) return;

  const nowSaved = SAVED.toggle(college);
  updateBadge();

  const card = app.querySelector(`.college-card[data-id="${id}"]`);
  if (card) RESULTS.updateSaveButton(card, nowSaved);
}

function renderSaved() {
  SAVED.render(app);
  updateBadge();

  const goSearch = app.querySelector('#btnGoSearch');
  if (goSearch) {
    goSearch.addEventListener('click', () => {
      State.currentStep = 0;
      State.formData = {};
      renderView('questionnaire');
    });
  }
}

// ===== HELPERS =====
function updateBadge() {
  const count = SAVED.getSavedIds().size;
  savedBadge.textContent = count;
  savedBadge.style.display = count > 0 ? 'inline-block' : 'none';
}

function showValidationError(msg) {
  // Remove old errors
  const old = app.querySelector('.validation-error');
  if (old) old.remove();

  const err = document.createElement('div');
  err.className = 'validation-error';
  err.style.cssText =
    'color:#ef4444;font-size:0.875rem;font-weight:600;margin-top:8px;display:flex;gap:6px;align-items:center';
  err.textContent = '⚠ ' + msg;

  const nav = app.querySelector('.step-nav');
  if (nav) nav.parentNode.insertBefore(err, nav);
}

function actToSat(act) {
  // Approximate ACT → SAT conversion
  const table = {
    36:1600, 35:1540, 34:1500, 33:1460, 32:1430,
    31:1400, 30:1370, 29:1340, 28:1310, 27:1280,
    26:1240, 25:1210, 24:1180, 23:1140, 22:1110,
    21:1080, 20:1040, 19:1010,  18:970, 17:930,
    16:890,  15:850,  14:800,  13:760, 12:710,
  };
  return table[act] || Math.round(act * 40 + 760);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
