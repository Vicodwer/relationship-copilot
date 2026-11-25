// Seeded random: same data on every page load
let seed = 42;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const pick = (arr) => arr[Math.floor(random() * arr.length)];
const randInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pad = (n) => String(n).padStart(2, "0");

// Pick n different items from an array
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let k = 0; k < n; k++) {
    const idx = Math.floor(random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};

// A date n days from today (negative = past, positive = future)
const offset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---------- Lists used to build the demo data ----------
const names = [
  "R. Sharma", "P. Reddy", "A. Khan", "S. Iyer", "M. Rao", "K. Das",
  "T. Naidu", "V. Menon", "H. Gupta", "L. Fernandes", "N. Verma",
];

// Relation per officer, in the same order as the names: 2 negative, 2 balanced, 7 good
const relations = [
  "Negative", "Good", "Balanced", "Good", "Good", "Negative",
  "Good", "Balanced", "Good", "Good", "Good",
];

const departments = [
  "Police & Home",
  "Smart City / Municipal",
  "Power & Energy",
  "Industries",
  "Roads & Transport",
];
const cadres = ["IAS", "IPS", "State Service"];
const fields = [
  "CCTV & surveillance",
  "IoT sensor networks",
  "Solar power approvals",
  "Industrial safety",
  "Municipal infrastructure",
];
const personalProjectNames = [
  "City CCTV rollout review",
  "Smart street-light IoT pilot",
  "Rooftop solar scheme for schools",
  "Police control-room upgrade",
  "Traffic signal IoT network",
  "Night-patrol surveillance plan",
];
const companyProjectNames = [
  "CCTV installation at government office",
  "IoT water-level sensors for district",
  "Solar plant NOC for pump station",
  "Surveillance tender for police station",
  "Solar + battery backup for substation",
  "Perimeter security for warehouse",
];
const outcomes = ["Approved", "Under review", "Approved with conditions"];
const notesFor = {
  Good: [
    "Helped fast-track a CCTV NOC last quarter",
    "Shared the solar subsidy dates early",
    "Invited us to the smart city review meeting",
  ],
  Balanced: [
    "Nothing pending on either side",
    "Site survey report exchanged last month",
  ],
  Negative: [
    "Promised a site visit that never happened",
    "Waiting for a reply to the IoT tender query",
    "Last surveillance approval was delayed without notice",
  ],
};
const promiseTexts = [
  "Share the CCTV tender clarification",
  "Confirm the site survey date for solar install",
  "Send the IoT data-privacy compliance note",
  "Forward the revised surveillance SOW",
  "Confirm the battery-backup load study",
];
const purposes = ["Tender clarification", "Site survey", "Approval / NOC", "Introduction", "Courtesy"];
const types = ["Internal", "External"];
const places = ["Secretariat", "Field office", "District office", "Conference hall"];

// ---------- Officer IDs (defined first, so meetings can link to them) ----------
const officerIds = names.map((_, i) => `OFF-${100 + i}`);

// ---------- Meetings ----------
// Past meetings are Completed or Cancelled; future meetings are Scheduled
export const meetings = Array.from({ length: 30 }, (_, i) => {
  const dayOffset = randInt(-150, 10);
  return {
    id: `MTG-${200 + i}`,
    officerId: pick(officerIds),
    date: offset(dayOffset),
    purpose: pick(purposes),
    type: pick(types),
    place: pick(places),
    followUpDate: offset(randInt(-4, 9)),
    status:
      dayOffset > 0 ? "Scheduled" : pick(["Completed", "Completed", "Cancelled"]),
  };
});

// ---------- Officers ----------
export const officers = names.map((name, i) => {
  const id = officerIds[i];
  const retired = i % 3 === 2; // every third officer is retired
  const relation = relations[i];

  // Retired officers were born earlier, so their retirement date is in the past
  const dobYear = retired ? randInt(1955, 1962) : randInt(1975, 1990);
  const dob = `${dobYear}-${pad(randInt(1, 12))}-${pad(randInt(1, 28))}`;

  // Last met = the most recent completed meeting with this officer
  // If there is none, use a date more than a year ago
  const lastCompleted = meetings
    .filter((m) => m.officerId === id && m.status === "Completed")
    .map((m) => m.date)
    .sort()
    .at(-1);

  return {
    id,
    name,
    department: pick(departments),
    cadre: pick(cadres),
    status: retired ? "Retired" : "Serving",
    batch: dobYear + 24, // year they joined service
    lastMet: lastCompleted ?? offset(-randInt(180, 365)),
    dob,
    retirementDate: `${dobYear + 60}-${dob.slice(5)}`,
    fieldOfWork: pick(fields),
    personalProjects: pickN(personalProjectNames, 2).map((p) => ({
      name: p,
      year: randInt(2015, 2025),
    })),
    companyProjects: pickN(companyProjectNames, 2).map((p) => ({
      name: p,
      year: randInt(2024, 2026),
      outcome: pick(outcomes),
    })),
    reciprocity: {
      direction: relation, // "Good", "Balanced" or "Negative"
      note: pick(notesFor[relation]),
    },
    openPromises: pickN(promiseTexts, 1),
    connections: pickN(officerIds.filter((x) => x !== id), 2), // IDs of related officers
  };
});

// ---------- Projects ----------
const stages = ["Tender", "Survey", "Approval", "Installation", "Handover"];

export const projects = companyProjectNames.map((title, i) => ({
  id: `PRJ-${300 + i}`,
  title,
  stage: pick(stages),
  officerId: officers[i % officers.length].id,
  lastUpdate: offset(-randInt(0, 40)),
  lakh: randInt(5, 120), // project value in lakhs
}));