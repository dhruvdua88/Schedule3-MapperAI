// ============ ENGAGEMENT STORE ============
// All localStorage operations. Keys are namespaced with 'ddandco_' prefix.

const KEY_API       = 'ddandco_deepseek_key';
const KEY_SETTINGS  = 'ddandco_settings';
const KEY_LIST      = 'ddandco_engagements';

// ---- API Key ----
export function getApiKey()     { return localStorage.getItem(KEY_API) || ''; }
export function setApiKey(key)  { localStorage.setItem(KEY_API, key.trim()); }
export function clearApiKey()   { localStorage.removeItem(KEY_API); }

// ---- App Settings ----
const DEFAULT_SETTINGS = {
  model:       'deepseek-v4-pro',   // NOTE: change if DeepSeek renames this model
  modelFlash:  'deepseek-v4-flash',
  firmName:    'Dhruv Dua & Co.',
  partnerName: 'Dhruv Dua',
  firmFRN:     '028145N',
  membershipNo:'531607',
  place:       'New Delhi',
};

export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY_SETTINGS));
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
}

// ---- Recent Engagements (last 5, metadata only) ----
function countsBySeverity(issues = []) {
  const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  issues.forEach((i) => { if (c[i.severity] !== undefined) c[i.severity]++; });
  return c;
}

export function listEngagements() {
  try {
    return JSON.parse(localStorage.getItem(KEY_LIST)) || [];
  } catch {
    return [];
  }
}

/**
 * Save an engagement. Keeps last 5.
 * Stores analysis + caro + reportFields (NO pdf markdown — per user spec).
 * Returns the generated id.
 */
export function saveEngagement({ analysis, caro, reportFields }) {
  const list  = listEngagements();
  const entry = {
    id:          Date.now().toString(),
    companyName: analysis?.company?.name || 'Unknown',
    cin:         analysis?.company?.cin  || '',
    yearEnd:     analysis?.company?.yearEnd || '',
    date:        new Date().toISOString(),
    counts:      countsBySeverity(analysis?.scheduleIIIIssues || []),
    caroApplies: !!caro?.applicability?.applies,
    // Full data stored here (no markdown)
    data: { analysis, caro, reportFields },
  };
  const updated = [entry, ...list].slice(0, 5);
  localStorage.setItem(KEY_LIST, JSON.stringify(updated));
  return entry.id;
}

export function loadEngagement(id) {
  const list = listEngagements();
  return list.find((e) => e.id === id) || null;
}

export function deleteEngagement(id) {
  const list = listEngagements().filter((e) => e.id !== id);
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
}

// ---- Export / Import Engagement as JSON ----
export function exportEngagement({ analysis, caro, reportFields }) {
  const payload = JSON.stringify({
    version:    1,
    exportedAt: new Date().toISOString(),
    analysis,
    caro,
    reportFields,
  }, null, 2);

  const blob    = new Blob([payload], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  const safeName = (analysis?.company?.name || 'engagement')
    .replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);

  a.href     = url;
  a.download = `${safeName}_engagement.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importEngagement(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.analysis) throw new Error('Missing analysis field');
        resolve(data);
      } catch (err) {
        reject(new Error('Could not parse engagement file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
