'use strict';

const SAVED = {
  STORAGE_KEY: 'collegeminer_saved',

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  save(colleges) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(colleges));
  },

  getSavedIds() {
    return new Set(this.load().map(c => c.id));
  },

  toggle(college) {
    const list = this.load();
    const idx = list.findIndex(c => c.id === college.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(college);
    }
    this.save(list);
    return idx < 0; // true if now saved
  },

  remove(id) {
    const list = this.load().filter(c => c.id !== id);
    this.save(list);
  },

  render(container) {
    const colleges = this.load();

    if (colleges.length === 0) {
      container.innerHTML = `
        <div class="saved-view">
          <h2>Saved Colleges</h2>
          <div class="empty-saved">
            <div class="empty-icon">🏛</div>
            <h3>No saved colleges yet</h3>
            <p>Use the heart button on results to save colleges here for easy comparison.</p>
            <button class="btn-primary" id="btnGoSearch">Start a Search</button>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="saved-view">
        <h2>Saved Colleges</h2>
        <p class="view-subtitle">${colleges.length} college${colleges.length !== 1 ? 's' : ''} saved</p>

        <div class="saved-actions">
          <button class="btn-primary" id="btnCompare" disabled>
            Compare Selected (0)
          </button>
          <button class="btn-secondary" id="btnGoSearch">New Search</button>
        </div>

        <div class="saved-list" id="savedList">
          ${colleges.map(c => this._renderItem(c)).join('')}
        </div>

        <div id="compareSection"></div>
      </div>`;

    this._attachListeners(container, colleges);
  },

  _renderItem(college) {
    return `
      <div class="saved-item" data-id="${college.id}">
        <input type="checkbox" class="compare-check" data-id="${college.id}" />
        <div class="saved-item-info">
          <h4>${college.name}</h4>
          <p>${college.city}, ${college.state} &bull;
             ${_cap(college.type)} &bull;
             ${_cap(college.setting)} &bull;
             Acceptance: ${college.acceptance_rate}% &bull;
             Avg GPA: ${college.avg_gpa.toFixed(1)}
          </p>
        </div>
        <div class="saved-item-tier">
          <span class="card-tier-badge ${college.tier || ''}">${_cap(college.tier || '')}</span>
        </div>
        <button class="btn-remove" data-id="${college.id}" title="Remove">✕</button>
      </div>`;
  },

  _renderCompareTable(selected) {
    if (selected.length < 2) return '';

    const fields = [
      { label: 'Location',        fn: c => `${c.city}, ${c.state}` },
      { label: 'Type',            fn: c => _cap(c.type) },
      { label: 'Setting',         fn: c => _cap(c.setting) },
      { label: 'Climate',         fn: c => _cap(c.climate) },
      { label: 'Size',            fn: c => _cap(c.size) },
      { label: 'Enrollment',      fn: c => c.enrollment.toLocaleString() },
      { label: 'Avg GPA',         fn: c => c.avg_gpa.toFixed(1) },
      { label: 'SAT Range',       fn: c => `${c.sat_range[0]}–${c.sat_range[1]}` },
      { label: 'Acceptance Rate', fn: c => `${c.acceptance_rate}%` },
      { label: 'Tuition',         fn: c => `$${c.tuition.toLocaleString()}/yr` },
      { label: 'Region',          fn: c => _cap(c.region) },
      { label: 'Top Programs',    fn: c => (c.notable_programs || []).slice(0,2).join(', ') },
      { label: 'Website',         fn: c => `<a href="${c.website}" target="_blank" rel="noopener" class="btn-visit">Visit ↗</a>` },
    ];

    const headerCells = selected.map(c => `<th>${c.name}</th>`).join('');
    const rows = fields.map(f => {
      const cells = selected.map(c => `<td>${f.fn(c)}</td>`).join('');
      return `<tr><td>${f.label}</td>${cells}</tr>`;
    }).join('');

    return `
      <div class="compare-section">
        <h3>Side-by-Side Comparison</h3>
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr><th></th>${headerCells}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _attachListeners(container, colleges) {
    const list = container.querySelector('#savedList');
    const compareBtn = container.querySelector('#btnCompare');
    const compareSection = container.querySelector('#compareSection');

    const getSelected = () => {
      const checks = list.querySelectorAll('.compare-check:checked');
      return Array.from(checks).map(ch => colleges.find(c => c.id === ch.dataset.id)).filter(Boolean);
    };

    const updateCompareBtn = () => {
      const sel = getSelected();
      compareBtn.disabled = sel.length < 2;
      compareBtn.textContent = `Compare Selected (${sel.length})`;
    };

    list.addEventListener('change', e => {
      if (e.target.classList.contains('compare-check')) {
        updateCompareBtn();
      }
    });

    list.addEventListener('click', e => {
      const removeBtn = e.target.closest('.btn-remove');
      if (removeBtn) {
        const id = removeBtn.dataset.id;
        this.remove(id);
        // Re-render
        this.render(container);
      }
    });

    compareBtn.addEventListener('click', () => {
      const selected = getSelected();
      if (selected.length < 2) return;
      compareSection.innerHTML = this._renderCompareTable(selected);
      compareSection.scrollIntoView({ behavior: 'smooth' });
    });
  },
};

function _cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
