'use strict';

/**
 * One-time import script: converts the College Scorecard CSV into colleges.json
 * Usage: node scripts/import-scorecard.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH  = path.join(__dirname, '../data/Scorecard_Data/Most-Recent-Cohorts-Institution.csv');
const OUT_PATH  = path.join(__dirname, '../data/colleges.json');

// ── CIP code → major label ────────────────────────────────────────────────────
const CIP_MAJORS = {
  PCIP04: 'Architecture',
  PCIP09: 'Communications',
  PCIP11: 'Computer Science',
  PCIP13: 'Education',
  PCIP14: 'Engineering',
  PCIP16: 'Foreign Languages',
  PCIP22: 'Law',
  PCIP23: 'English',
  PCIP26: 'Biology',
  PCIP27: 'Mathematics',
  PCIP38: 'Philosophy',
  PCIP40: 'Physics',
  PCIP42: 'Psychology',
  PCIP45: 'Social Sciences',
  PCIP50: 'Arts',
  PCIP51: 'Health Sciences',
  PCIP52: 'Business',
  PCIP54: 'History',
};

// ── Region mapping ────────────────────────────────────────────────────────────
const REGION_MAP = {
  '1': 'northeast', // New England
  '2': 'northeast', // Mid East
  '3': 'midwest',   // Great Lakes
  '4': 'midwest',   // Plains
  '5': 'south',     // Southeast
  '6': 'south',     // Southwest
  '7': 'west',      // Rocky Mountains
  '8': 'west',      // Far West
};

// ── Climate by state ──────────────────────────────────────────────────────────
const WARM = new Set(['FL','HI','TX','AZ','NM','LA','MS','AL','GA','SC','CA','NV']);
const COLD = new Set(['AK','MN','WI','MI','ME','VT','NH','ND','SD','WY','MT','ID','MO','IN','OH']);

function stateToClimate(s) {
  if (WARM.has(s)) return 'warm';
  if (COLD.has(s)) return 'cold';
  return 'mild';
}

// ── Locale → setting ──────────────────────────────────────────────────────────
function localeToSetting(locale) {
  const n = parseInt(locale);
  if (n >= 11 && n <= 13) return 'urban';
  if (n >= 21 && n <= 23) return 'suburban';
  if (n >= 31 && n <= 43) return 'rural';
  return 'suburban';
}

// ── SAT average → estimated avg GPA ──────────────────────────────────────────
function satToGpa(sat) {
  if (!sat) return 3.0;
  if (sat >= 1500) return 3.9;
  if (sat >= 1400) return 3.7;
  if (sat >= 1300) return 3.5;
  if (sat >= 1200) return 3.2;
  if (sat >= 1100) return 3.0;
  return 2.7;
}

// ── Enrollment → size ─────────────────────────────────────────────────────────
function enrollmentToSize(n) {
  if (n < 5000)  return 'small';
  if (n <= 15000) return 'medium';
  return 'large';
}

// ── Simple CSV parser (handles quoted fields) ─────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) });
  let headers = null;
  const colleges = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const fields = parseCSVLine(line);

    if (lineNum === 1) {
      headers = fields;
      continue;
    }

    const row = {};
    headers.forEach((h, i) => { row[h] = fields[i] || ''; });

    // ── Filters ──────────────────────────────────────────────────────────────
    // Main campus only
    if (row.MAIN !== '1') continue;
    // Bachelor's-predominant (PREDDEG=3) or graduate-dominant (4)
    if (row.PREDDEG !== '3' && row.PREDDEG !== '4') continue;
    // Must have a name
    if (!row.INSTNM) continue;
    // Must have SAT data
    const satAvg = num(row.SAT_AVG) || num(row.SAT_AVG_ALL);
    const satVR25 = num(row.SATVR25);
    const satMT25 = num(row.SATMT25);
    const satVR75 = num(row.SATVR75);
    const satMT75 = num(row.SATMT75);
    if (!satAvg && !(satVR25 && satMT25)) continue;

    // ── SAT range ─────────────────────────────────────────────────────────────
    const satLow  = satVR25 && satMT25 ? Math.round(satVR25 + satMT25) : Math.round(satAvg - 100);
    const satHigh = satVR75 && satMT75 ? Math.round(satVR75 + satMT75) : Math.round(satAvg + 100);

    // ── Admission rate ────────────────────────────────────────────────────────
    const admRate = num(row.ADM_RATE) ?? num(row.ADM_RATE_ALL);
    const acceptanceRate = admRate != null ? Math.round(admRate * 100) : 50;

    // ── Enrollment ────────────────────────────────────────────────────────────
    const enrollment = Math.round(num(row.UGDS) || 0);

    // ── Tuition ───────────────────────────────────────────────────────────────
    const control = row.CONTROL;
    const tuitionIn  = num(row.TUITIONFEE_IN);
    const tuitionOut = num(row.TUITIONFEE_OUT);
    const tuition = Math.round(
      control === '1' ? (tuitionOut || tuitionIn || 0) : (tuitionOut || tuitionIn || 0)
    );

    // ── Majors from CIP codes ─────────────────────────────────────────────────
    const majorEntries = Object.entries(CIP_MAJORS)
      .map(([col, label]) => ({ label, pct: num(row[col]) || 0 }))
      .filter(m => m.pct > 0.01);

    const majors = majorEntries.map(m => m.label);
    const notable_programs = majorEntries
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
      .map(m => m.label);

    if (majors.length === 0) majors.push('Liberal Arts');

    // ── Website ───────────────────────────────────────────────────────────────
    let website = row.INSTURL || '';
    if (website && !website.startsWith('http')) website = 'https://' + website;

    colleges.push({
      id:               row.UNITID,
      name:             row.INSTNM,
      city:             row.CITY,
      state:            row.STABBR,
      region:           REGION_MAP[row.REGION] || 'other',
      setting:          localeToSetting(row.LOCALE),
      climate:          stateToClimate(row.STABBR),
      type:             control === '1' ? 'public' : 'private',
      size:             enrollmentToSize(enrollment),
      enrollment,
      avg_gpa:          satToGpa(satAvg || (satLow + satHigh) / 2),
      sat_range:        [satLow, satHigh],
      acceptance_rate:  acceptanceRate,
      tuition,
      majors,
      notable_programs,
      description:      `${row.INSTNM} is located in ${row.CITY}, ${row.STABBR}.`,
      website,
    });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(colleges, null, 2));
  console.log(`✓ Wrote ${colleges.length} colleges to ${OUT_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
