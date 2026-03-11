'use strict';

const RESULTS = {
  render(container, colleges, savedIds) {
    if (!colleges || colleges.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <div style="font-size:3rem;margin-bottom:12px">🔍</div>
          <h3>No colleges found</h3>
          <p>Try adjusting your preferences — for example, selecting a different tier or broadening your region choices.</p>
          <button class="btn-primary" id="btnRetry">Try Again</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="results-header">
        <div>
          <h2>Your College Matches</h2>
          <p>${colleges.length} college${colleges.length !== 1 ? 's' : ''} found for you</p>
        </div>
        <button class="btn-secondary" id="btnNewSearch">New Search</button>
      </div>
      <div class="results-grid" id="resultsGrid">
        ${colleges.map(c => this._renderCard(c, savedIds)).join('')}
      </div>`;
  },

  _renderCard(college, savedIds) {
    const isSaved = savedIds.has(college.id);
    const acceptDisplay = college.acceptance_rate < 1
      ? '< 1%'
      : `${college.acceptance_rate}%`;

    return `
      <div class="college-card" data-id="${college.id}">
        <div class="card-header">
          <span class="card-tier-badge ${college.tier}">${_cap(college.tier)}</span>
          <h3>${college.name}</h3>
          <div class="card-location">📍 ${college.city}, ${college.state}</div>
        </div>
        <div class="card-body">
          <div class="card-stats">
            <div class="stat">
              <div class="stat-label">Acceptance Rate</div>
              <div class="stat-value">${acceptDisplay}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Avg GPA</div>
              <div class="stat-value">${college.avg_gpa.toFixed(1)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">SAT Range</div>
              <div class="stat-value">${college.sat_range[0]}–${college.sat_range[1]}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Tuition</div>
              <div class="stat-value">$${(college.tuition / 1000).toFixed(0)}k/yr</div>
            </div>
          </div>

          <div class="card-badges">
            <span class="badge">${_cap(college.type)}</span>
            <span class="badge">${_cap(college.setting)}</span>
            <span class="badge">${_cap(college.climate)}</span>
            <span class="badge">${_cap(college.size)}</span>
          </div>

          <div class="card-reasons">
            <h4>Why it fits you</h4>
            <ul>
              ${(college.reasons || []).slice(0, 4).map(r => `<li>${r}</li>`).join('')}
            </ul>
            ${college.summary ? `<p class="fit-summary">${college.summary}</p>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-save ${isSaved ? 'saved' : ''}"
                  data-id="${college.id}"
                  data-action="save">
            ${isSaved ? '♥ Saved' : '♡ Save'}
          </button>
          <span class="score-badge">Match: ${Math.round(college.score)}%</span>
          <a href="${college.website}" target="_blank" rel="noopener" class="btn-visit">
            Visit ↗
          </a>
        </div>
      </div>`;
  },

  updateSaveButton(cardEl, isSaved) {
    const btn = cardEl.querySelector('.btn-save');
    if (!btn) return;
    btn.classList.toggle('saved', isSaved);
    btn.textContent = isSaved ? '♥ Saved' : '♡ Save';
  },
};

function _cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
