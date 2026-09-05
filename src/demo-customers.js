import { normalizeCustomerDirectory } from "./customers.js";

const DEMO_SEGMENTS = Object.freeze([
  { name: "New self-serve teams", owner: ["Growth PM", "Monetization PM"] },
  { name: "Support and success", owner: ["Platform PM"] },
  { name: "Security admins", owner: ["Trust PM"] }
]);

const DEMO_TAGS = Object.freeze([
  { id: "tag-demo-design-partner", name: "Design partner" },
  { id: "tag-demo-expansion", name: "Expansion potential" },
  { id: "tag-demo-renewal-watch", name: "Renewal watch" },
  { id: "tag-demo-beta", name: "Beta program" }
]);

const COMPANY_ROOTS = Object.freeze([
  "Northstar", "Lattice", "Harbor", "Summit", "Juniper",
  "Cedar", "Orbit", "Beacon", "Atlas", "Copper",
  "Willow", "Mosaic", "Nimbus", "Pioneer", "Evergreen",
  "Vertex", "Bluebird", "Keystone", "Redwood", "Solstice"
]);

const COMPANY_SUFFIXES = Object.freeze(["Labs", "Systems", "Works", "Cloud", "Group"]);
const INDUSTRIES = Object.freeze(["SaaS", "Fintech", "Healthcare", "Retail", "Media", "Logistics", "Education", "Cybersecurity"]);
const REGIONS = Object.freeze(["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"]);
const STATUSES = Object.freeze(["active", "active", "active", "trial", "prospect", "active", "churned"]);

export function createDemoCustomerDirectory(directory, organization = {}) {
  const current = normalizeCustomerDirectory(directory);
  const primaryTags = DEMO_SEGMENTS.map((segment) => {
    const tag = current.tags.find((entry) => entry.name.toLowerCase() === segment.name.toLowerCase());
    if (!tag) throw new Error(`Demo customer segment tag is missing: ${segment.name}`);
    return tag;
  });
  const tags = [
    ...current.tags.filter((tag) => !DEMO_TAGS.some((demoTag) => demoTag.id === tag.id)),
    ...DEMO_TAGS
  ];
  const peopleByName = new Map((organization.people || []).map((person) => [person.displayName, person.id]));
  const accounts = Array.from({ length: 100 }, (_, index) => demoAccount(index, primaryTags, peopleByName));
  return normalizeCustomerDirectory({ ...current, accounts, tags });
}

function demoAccount(index, primaryTags, peopleByName) {
  const segmentIndex = index % DEMO_SEGMENTS.length;
  const segment = DEMO_SEGMENTS[segmentIndex];
  const root = COMPANY_ROOTS[Math.floor(index / COMPANY_SUFFIXES.length)];
  const suffix = COMPANY_SUFFIXES[index % COMPANY_SUFFIXES.length];
  const companyName = `${root} ${suffix}`;
  const tagIds = [primaryTags[segmentIndex].id];
  if (index % 4 === 0) tagIds.push("tag-demo-design-partner");
  if (index % 6 === 0) tagIds.push("tag-demo-expansion");
  if (index % 9 === 0) tagIds.push("tag-demo-renewal-watch");
  if (index % 10 === 0) tagIds.push("tag-demo-beta");
  const ownerNames = segment.owner;
  const ownerPersonId = peopleByName.get(ownerNames[index % ownerNames.length]) || "";
  const employeeCount = segmentIndex === 0
    ? 12 + (index * 17) % 220
    : segmentIndex === 1
      ? 150 + (index * 53) % 1350
      : 1200 + (index * 211) % 8800;
  const planTier = segmentIndex === 0
    ? ["Starter", "Growth"][index % 2]
    : segmentIndex === 1
      ? ["Growth", "Business"][index % 2]
      : "Enterprise";
  const createdAt = new Date(Date.UTC(2026, index % 6, (index % 27) + 1, 9)).toISOString();

  return {
    id: `demo-customer-${String(index + 1).padStart(3, "0")}`,
    name: companyName,
    domain: `${slug(companyName)}.example`,
    status: STATUSES[index % STATUSES.length],
    industry: INDUSTRIES[index % INDUSTRIES.length],
    region: REGIONS[index % REGIONS.length],
    employeeCount,
    planTier,
    ownerPersonId,
    notes: `Synthetic demo account for the ${segment.name} audience.`,
    tagIds,
    attributes: {},
    createdAt,
    updatedAt: createdAt
  };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
