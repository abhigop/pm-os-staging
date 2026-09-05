import { workspaceCapabilityEnabled } from "./experience.js";
import { isPlainDate } from "./planning-calendar.js";

const VIEW_ORDER = Object.freeze(["today", "initiatives", "insights", "planning", "delivery", "briefings", "team", "settings"]);
const SIMPLE_NAVIGATION_IDS = Object.freeze(["today", "initiatives", "insights", "settings"]);
const SHELL_PARENT = Object.freeze({ planning: "initiatives", delivery: "initiatives", briefings: "today", team: "settings" });

export function experienceHas(experience, capabilityId) {
  return workspaceCapabilityEnabled(experience, capabilityId);
}

export function isFullExperience(experience) {
  // Kept as a compatibility export for older callers. Capability data no
  // longer selects a second interface.
  return false;
}

export function enabledViewDefinitions(experience, viewRegistry) {
  const enabled = new Set(["today", "initiatives", "insights", "settings"]);
  if (experienceHas(experience, "timeline-planning") || experienceHas(experience, "portfolio-planning")) enabled.add("planning");
  if (experienceHas(experience, "delivery-tracking") || experienceHas(experience, "launch-readiness")) enabled.add("delivery");
  if (experienceHas(experience, "leadership-briefing") || experienceHas(experience, "communications-reviews")) enabled.add("briefings");
  if (experienceHas(experience, "team-ownership")) enabled.add("team");
  return viewRegistry.filter((view) => enabled.has(view.id)).sort((left, right) => VIEW_ORDER.indexOf(left.id) - VIEW_ORDER.indexOf(right.id));
}

export function simpleNavigationViewDefinitions(viewRegistry) {
  return SIMPLE_NAVIGATION_IDS.map((id) => viewRegistry.find((view) => view.id === id)).filter(Boolean);
}

export function shellParentView(space) {
  return SHELL_PARENT[space] || (SIMPLE_NAVIGATION_IDS.includes(space) ? space : "today");
}

export function visibleViewDefinition(deepLink, enabledViews) {
  return enabledViews.find((view) => view.deepLink === deepLink);
}

export function viewLabel(view) {
  return view.id === "initiatives" ? "Work" : view.label;
}

export function allowedModes(space, experience) {
  return {
    today: ["focus", "actions"],
    initiatives: ["list", "priorities", "board", "roadmap", ...(experienceHas(experience, "portfolio-planning") ? ["portfolio"] : [])],
    insights: ["discovery", ...(experienceHas(experience, "research-validation") ? ["research", "validation"] : []), "feedback", ...(experienceHas(experience, "customer-support") ? ["support", "customers"] : [])],
    planning: [...(experienceHas(experience, "timeline-planning") ? ["quarter", "roadmap"] : []), ...(experienceHas(experience, "portfolio-planning") ? ["capacity", "outcomes", "metrics"] : [])],
    delivery: [...(experienceHas(experience, "delivery-tracking") ? ["board", "dependencies"] : []), ...(experienceHas(experience, "launch-readiness") ? ["readiness", "launch", "enablement"] : [])],
    briefings: [...(experienceHas(experience, "leadership-briefing") ? ["executive", "stakeholders", "escalations", "decisions", "operations"] : []), ...(experienceHas(experience, "communications-reviews") ? ["updates", "comms", "meetings", "review", "retros", "specs", "templates"] : [])],
    team: experienceHas(experience, "team-ownership") ? ["organization", "people"] : [],
    settings: ["setup", "data", ...(experienceHas(experience, "custom-workflow") ? ["workflow"] : []), ...(experienceHas(experience, "timeline-planning") ? ["calendar"] : []), ...(experienceHas(experience, "advanced-prioritization") ? ["prioritization"] : []), ...(experienceHas(experience, "activity-history") ? ["activity"] : [])]
  }[space] || [];
}

export function nearestCoreView(space) {
  if (["planning", "delivery"].includes(space)) return "initiatives";
  if (space === "team") return "settings";
  return "today";
}

export function defaultSpaceMode(space, experience) {
  if (space === "settings") return "setup";
  return allowedModes(space, experience)[0] || ({ today: "focus", initiatives: "list", insights: "discovery" })[space] || "focus";
}

export function periodRequestInvalid(params, calendar) {
  const kind = String(params.get("period") || "all").toLowerCase();
  if (["all", "unscheduled"].includes(kind)) return false;
  return !calendar.enabledPeriodTypes.includes(kind) || !isPlainDate(params.get("periodStart"));
}
