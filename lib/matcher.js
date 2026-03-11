'use strict';

/**
 * Classify a college as safety / target / reach for a given user.
 */
function classify(user, college) {
  const gpaDiff = user.gpa - college.avg_gpa;
  const satMid = (college.sat_range[0] + college.sat_range[1]) / 2;

  if (
    college.acceptance_rate >= 50 &&
    gpaDiff >= -0.1 &&
    user.sat >= satMid - 50
  ) {
    return 'safety';
  }
  if (college.acceptance_rate <= 25 || gpaDiff <= -0.4) {
    return 'reach';
  }
  return 'target';
}

/**
 * Score a college 0–100 based on user preferences.
 */
function score(user, college) {
  let pts = 0;

  // Major match: +30
  if (user.major && college.majors.includes(user.major)) {
    pts += 30;
  }

  // Region match: +25 (any match if multi-select)
  if (
    user.regions &&
    user.regions.length > 0 &&
    !user.regions.includes('no_preference') &&
    user.regions.includes(college.region)
  ) {
    pts += 25;
  } else if (!user.regions || user.regions.includes('no_preference')) {
    pts += 25; // no preference = neutral, award full points
  }

  // Setting match: +20
  if (!user.setting || user.setting === 'no_preference') {
    pts += 20;
  } else if (user.setting === college.setting) {
    pts += 20;
  }

  // Climate match: +15
  if (!user.climate || user.climate === 'no_preference') {
    pts += 15;
  } else if (user.climate === college.climate) {
    pts += 15;
  }

  // Size match: +10
  if (!user.size || user.size === 'no_preference') {
    pts += 10;
  } else if (user.size === college.size) {
    pts += 10;
  }

  // GPA proximity bonus: up to +5
  const gpaDiff = Math.abs(user.gpa - college.avg_gpa);
  const gpaBonus = Math.max(0, 5 - gpaDiff * 10);
  pts += gpaBonus;

  return Math.min(100, pts);
}

/**
 * Generate human-readable fit reasons.
 */
function fitReasons(user, college) {
  const reasons = [];

  if (user.major && college.majors.includes(user.major)) {
    reasons.push(`Strong ${user.major} program`);
  }

  if (
    user.regions &&
    !user.regions.includes('no_preference') &&
    user.regions.includes(college.region)
  ) {
    reasons.push(`Located in your preferred region (${college.region})`);
  }

  if (user.setting && user.setting !== 'no_preference' && user.setting === college.setting) {
    reasons.push(`${capitalize(college.setting)} campus setting matches your preference`);
  }

  if (user.climate && user.climate !== 'no_preference' && user.climate === college.climate) {
    reasons.push(`${capitalize(college.climate)} climate matches your preference`);
  }

  if (user.size && user.size !== 'no_preference' && user.size === college.size) {
    reasons.push(`${capitalize(college.size)} school size matches your preference`);
  }

  const gpaDiff = user.gpa - college.avg_gpa;
  if (Math.abs(gpaDiff) <= 0.2) {
    reasons.push(`Your GPA (${user.gpa.toFixed(1)}) is close to the school average (${college.avg_gpa.toFixed(1)})`);
  } else if (gpaDiff > 0.2) {
    reasons.push(`Your GPA (${user.gpa.toFixed(1)}) is above the school average (${college.avg_gpa.toFixed(1)})`);
  }

  if (user.sat >= college.sat_range[0] && user.sat <= college.sat_range[1]) {
    reasons.push(`Your SAT score (${user.sat}) falls within the school's range (${college.sat_range[0]}–${college.sat_range[1]})`);
  } else if (user.sat > college.sat_range[1]) {
    reasons.push(`Your SAT score (${user.sat}) is above the school's typical range`);
  }

  if (user.type && user.type !== 'no_preference' && user.type === college.type) {
    reasons.push(`${capitalize(college.type)} institution matches your preference`);
  }

  if (reasons.length === 0) {
    reasons.push('Meets your academic profile');
  }

  return reasons;
}

/**
 * Generate a 1–2 sentence prose summary highlighting the school's unique qualities.
 * Focuses on the institution's distinctive characteristics, not the user's stats.
 */
function fitSummary(user, college) {
  const sentences = [];

  // Sentence 1: school's known strength in the user's chosen major
  const programMatch = user.major ? _findProgramMatch(user.major, college.notable_programs) : null;
  const majorLabel = user.major ? user.major.replace(/_/g, ' ') : '';

  if (programMatch) {
    sentences.push(
      `${college.name} is particularly well-regarded for its ${programMatch} program, giving you a strong academic home for your interest in ${majorLabel}.`
    );
  } else if (user.major && college.majors.includes(user.major)) {
    sentences.push(
      `${college.name} offers a solid ${majorLabel} track within a broad and rigorous academic environment.`
    );
  }

  // Sentence 2: most distinctive sentence from the school's own description
  // Skip the first (generic intro) and use the second when available
  const descSentences = college.description
    .split(/\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30);

  const uniqueSentence = descSentences.length > 1 ? descSentences[1] : descSentences[0];
  if (uniqueSentence) {
    let s = uniqueSentence.trim();
    if (!s.endsWith('.')) s += '.';
    sentences.push(s);
  }

  return sentences.join(' ');
}

function _findProgramMatch(major, programs) {
  const majorPhrase = major.replace(/_/g, ' ').toLowerCase();
  // Exclude generic words that appear in many program names
  const stopWords = new Set(['science', 'studies', 'arts', 'and', 'the', 'of', 'to']);
  const majorWords = majorPhrase.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

  return programs.find(p => {
    const prog = p.toLowerCase();
    // Prefer full phrase match first
    if (prog.includes(majorPhrase)) return true;
    // Fallback: every significant word must appear in the program name
    return majorWords.length > 0 && majorWords.every(word => prog.includes(word));
  }) || null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main exported function.
 */
function recommend(prefs, colleges) {
  const tier = prefs.tier || 'target';
  const limit = Math.min(Math.max(parseInt(prefs.count) || 10, 1), 20);

  const filtered = colleges.filter(college => {
    // Apply school type filter (public/private)
    if (prefs.type && prefs.type !== 'no_preference' && college.type !== prefs.type) {
      return false;
    }
    const tier_class = classify(prefs, college);
    return tier_class === tier;
  });

  const scored = filtered.map(college => {
    const collegeTier = classify(prefs, college);
    return {
      ...college,
      score: score(prefs, college),
      reasons: fitReasons(prefs, college),
      summary: fitSummary(prefs, college),
      tier: collegeTier,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

module.exports = { recommend };
