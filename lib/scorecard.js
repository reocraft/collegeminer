'use strict';

const API_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';
const API_KEY = process.env.SCORECARD_API_KEY || 'DEMO_KEY';
const PER_PAGE = 100;

// ── Field mappings ────────────────────────────────────────────────────────────

const REGION_MAP = {
  1: 'northeast', // New England
  2: 'northeast', // Mid East
  3: 'midwest',   // Great Lakes
  4: 'midwest',   // Plains
  5: 'south',     // Southeast
  6: 'south',     // Southwest
  7: 'west',      // Rocky Mountains
  8: 'west',      // Far West
};

const WARM_STATES = new Set(['FL','HI','TX','AZ','NM','LA','MS','AL','GA','SC','CA','NV']);
const COLD_STATES = new Set(['AK','MN','WI','MI','ME','VT','NH','ND','SD','WY','MT','ID','MO','IN','OH']);

const MAJOR_MAP = [
  { key: 'computer_and_information_sciences',       label: 'Computer Science' },
  { key: 'engineering',                              label: 'Engineering' },
  { key: 'business_marketing',                       label: 'Business' },
  { key: 'biological_and_biomedical',                label: 'Biology' },
  { key: 'health',                                   label: 'Health Sciences' },
  { key: 'social_science',                           label: 'Social Sciences' },
  { key: 'education',                                label: 'Education' },
  { key: 'psychology',                               label: 'Psychology' },
  { key: 'communication_communications_technology',  label: 'Communications' },
  { key: 'visual_performing',                        label: 'Arts' },
  { key: 'math_and_statistics',                      label: 'Mathematics' },
  { key: 'physical_sciences',                        label: 'Physics' },
  { key: 'english_language_literature_composition',  label: 'English' },
  { key: 'history',                                  label: 'History' },
  { key: 'philosophy_religious',                     label: 'Philosophy' },
  { key: 'architecture_and_related_services',        label: 'Architecture' },
  { key: 'legal',                                    label: 'Law' },
  { key: 'language_linguistics_literature_and_humanities', label: 'Humanities' },
];

const PROG_FIELDS = MAJOR_MAP.map(m =>
  `latest.academics.program_percentage.${m.key}`
).join(',');

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.region_id',
  'school.locale',
  'school.ownership',
  'school.school_url',
  'latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.25th_percentile.critical_reading',
  'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.admissions.sat_scores.25th_percentile.math',
  'latest.admissions.sat_scores.75th_percentile.math',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  PROG_FIELDS,
].join(',');

// ── Helpers ───────────────────────────────────────────────────────────────────

function localeToSetting(locale) {
  if (!locale) return 'suburban';
  if (locale >= 11 && locale <= 13) return 'urban';
  if (locale >= 21 && locale <= 23) return 'suburban';
  return 'rural';
}

function stateToClimate(state) {
  if (WARM_STATES.has(state)) return 'warm';
  if (COLD_STATES.has(state)) return 'cold';
  return 'mild';
}

function enrollmentToSize(n) {
  if (!n || n < 5000)  return 'small';
  if (n <= 15000)      return 'medium';
  return 'large';
}

function satToGpa(satMid) {
  if (!satMid)        return 3.0;
  if (satMid >= 1500) return 3.9;
  if (satMid >= 1400) return 3.7;
  if (satMid >= 1300) return 3.5;
  if (satMid >= 1200) return 3.2;
  if (satMid >= 1100) return 3.0;
  return 2.7;
}

function extractMajors(school) {
  const prog = school['latest.academics.program_percentage'] || {};
  return MAJOR_MAP
    .filter(m => (prog[m.key] || 0) > 0.01)
    .map(m => m.label);
}

function notablePrograms(school) {
  const prog = school['latest.academics.program_percentage'] || {};
  return MAJOR_MAP
    .filter(m => (prog[m.key] || 0) > 0.05)
    .sort((a, b) => (prog[b.key] || 0) - (prog[a.key] || 0))
    .slice(0, 5)
    .map(m => m.label);
}

function transform(school) {
  const sat25r = school['latest.admissions.sat_scores.25th_percentile.critical_reading'];
  const sat75r = school['latest.admissions.sat_scores.75th_percentile.critical_reading'];
  const sat25m = school['latest.admissions.sat_scores.25th_percentile.math'];
  const sat75m = school['latest.admissions.sat_scores.75th_percentile.math'];

  const satLow  = sat25r && sat25m ? sat25r + sat25m : null;
  const satHigh = sat75r && sat75m ? sat75r + sat75m : null;
  const satRange = satLow && satHigh ? [satLow, satHigh] : [800, 1600];

  const satMid = satLow && satHigh ? (satLow + satHigh) / 2 : null;
  const admRate = school['latest.admissions.admission_rate.overall'];
  const enrollment = school['latest.student.size'];
  const state = school['school.state'];
  const tuitionIn  = school['latest.cost.tuition.in_state'];
  const tuitionOut = school['latest.cost.tuition.out_of_state'];
  const ownership  = school['school.ownership'];

  const majors = extractMajors(school);

  return {
    id:              String(school.id),
    name:            school['school.name'],
    city:            school['school.city'] || '',
    state:           state || '',
    region:          REGION_MAP[school['school.region_id']] || 'other',
    setting:         localeToSetting(school['school.locale']),
    climate:         stateToClimate(state),
    type:            ownership === 1 ? 'public' : 'private',
    size:            enrollmentToSize(enrollment),
    enrollment:      enrollment || 0,
    avg_gpa:         satToGpa(satMid),
    sat_range:       satRange,
    acceptance_rate: admRate != null ? Math.round(admRate * 100) : 50,
    tuition:         (ownership === 1 ? tuitionIn : tuitionOut) || tuitionOut || tuitionIn || 0,
    majors:          majors.length ? majors : ['Liberal Arts'],
    notable_programs: notablePrograms(school),
    description:     `${school['school.name']} is located in ${school['school.city'] || 'the US'}, ${state}.`,
    website:         school['school.school_url']
                       ? `https://${school['school.school_url']}`
                       : '',
  };
}

// ── Fetching ──────────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const url = new URL(API_BASE);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('per_page', PER_PAGE);
  url.searchParams.set('page', page);
  // 4-year degree-granting schools only
  url.searchParams.set('school.degrees_awarded.predominant', '3');
  // Must have SAT data
  url.searchParams.set('latest.admissions.sat_scores.midpoint.critical_reading__range', '200..800');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Scorecard API error: ${res.status}`);
  return res.json();
}

async function fetchAllColleges() {
  console.log('[scorecard] Fetching colleges from College Scorecard API...');
  const first = await fetchPage(0);
  const total = first.metadata.total;
  const totalPages = Math.ceil(total / PER_PAGE);
  console.log(`[scorecard] ${total} schools found across ${totalPages} pages`);

  const schools = [...first.results];

  // Fetch remaining pages in parallel (batches of 10 to be polite)
  for (let start = 1; start < totalPages; start += 10) {
    const batch = [];
    for (let p = start; p < Math.min(start + 10, totalPages); p++) {
      batch.push(fetchPage(p));
    }
    const pages = await Promise.all(batch);
    for (const page of pages) schools.push(...page.results);
  }

  const colleges = schools
    .map(transform)
    .filter(c => c.name && c.sat_range[0] > 800);

  console.log(`[scorecard] Loaded ${colleges.length} colleges.`);
  return colleges;
}

module.exports = { fetchAllColleges };
