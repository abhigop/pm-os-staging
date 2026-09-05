export const TUTORIAL_STORAGE_KEY = "pm-os-staging.tutorial.v1";

const groupDefinitions = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "Learn the workspace map and the controls shared across PM OS.",
    steps: [
      {
        id: "workspace-map",
        space: "today",
        mode: "focus",
        target: "workspace-navigation",
        title: "Your product workspace",
        description: "Eight spaces organize daily focus, initiatives, evidence, plans, delivery, briefings, team ownership, and settings. The source card shows where this workspace currently lives."
      },
      {
        id: "shared-controls",
        space: "today",
        mode: "focus",
        target: "workspace-controls",
        title: "Controls that travel with the work",
        description: "Search, theme, and initiative commands stay close at hand. The weekly loop shortcuts recurring PM rituals, while timeline scope keeps operational views on the same period."
      }
    ]
  },
  {
    id: "today",
    label: "Today",
    description: "See what needs attention now and turn operational gaps into action.",
    steps: [
      { id: "focus", space: "today", mode: "focus", target: "active-mode", title: "Focus", description: "Scan workspace health, the ranked priority stack, and follow-up signals without moving between dashboards." },
      { id: "actions", space: "today", mode: "actions", target: "active-mode", title: "Actions", description: "Collect overdue work, blockers, missing owners, decision gaps, metric gaps, and stale initiatives into one actionable queue and memo." }
    ]
  },
  {
    id: "initiatives",
    label: "Initiatives",
    description: "Capture, compare, move, and review the portfolio of product work.",
    steps: [
      { id: "list", space: "initiatives", mode: "list", target: "active-mode", title: "Initiative list and details", description: "Search every initiative, use the shared create and edit flow, and open details to manage independently owned risks, dependencies, evidence, and decisions." },
      { id: "priorities", space: "initiatives", mode: "priorities", target: "active-mode", title: "Priorities", description: "Review the ranked portfolio with score provenance, explicit missing inputs, and accessible manual or priority-level ordering." },
      { id: "board", space: "initiatives", mode: "board", target: "active-mode", title: "Team-scoped board", description: "View All teams, Unassigned, or one exact team; create in a stage and move work by pointer, keyboard, or touch without changing its priority." },
      { id: "portfolio", space: "initiatives", mode: "portfolio", target: "active-mode", title: "Portfolio", description: "Roll up status, objectives, audience concentration, capacity, watchlists, and an executive-ready portfolio memo." }
    ]
  },
  {
    id: "insights",
    label: "Insights",
    description: "Connect discovery, research, validation, feedback, support, and customers.",
    steps: [
      { id: "discovery", space: "insights", mode: "discovery", target: "active-mode", title: "Discovery", description: "Track opportunities, problems, hypotheses, confidence, next steps, and linked learning; validated discoveries can become initiatives." },
      { id: "research", space: "insights", mode: "research", target: "active-mode", title: "Research", description: "Plan studies with objectives, questions, methods, recruiting targets, participant progress, findings, and lifecycle state." },
      { id: "validation", space: "insights", mode: "validation", target: "active-mode", title: "Validation", description: "Run experiments with hypotheses, methods, success metrics, results, decisions, and evidence gaps inherited from discovery." },
      { id: "feedback", space: "insights", mode: "feedback", target: "active-mode", title: "Feedback", description: "Triage source-attributed signals and build themes only from explicit tags, keeping synthesis traceable to real evidence." },
      { id: "support", space: "insights", mode: "support", target: "active-mode", title: "Support", description: "Manage customer cases by impact, severity, response deadline, owner, resolution, and a copyable support memo." },
      { id: "customers", space: "insights", mode: "customers", target: "active-mode", title: "Customers", description: "Maintain searchable accounts, reusable tags, typed fields, rule-based segments, validated CSV exchange, and explicit initiative targeting." }
    ]
  },
  {
    id: "planning",
    label: "Planning",
    description: "Shape scope, capacity, outcomes, and measurement across planning horizons.",
    steps: [
      { id: "quarter", space: "planning", mode: "quarter", target: "active-mode", title: "Plan", description: "Choose strategic bets, selected and deferred work, capacity fit, risks, and a scope-labelled memo for the active period." },
      { id: "roadmap", space: "planning", mode: "roadmap", target: "active-mode", title: "Roadmap", description: "Organize initiatives across Now, Next, and Later while preserving the shared source record behind every card." },
      { id: "capacity", space: "planning", mode: "capacity", target: "active-mode", title: "Capacity", description: "Compare planned effort with available capacity, expose overage, and identify suggested cuts and deferred work." },
      { id: "outcomes", space: "planning", mode: "outcomes", target: "active-mode", title: "Outcomes", description: "Align initiatives to objectives, find uncovered outcomes and metric gaps, and create an outcome memo." },
      { id: "metrics", space: "planning", mode: "metrics", target: "active-mode", title: "Metrics", description: "Plan primary metrics, leading indicators, instrumentation, tracking gaps, review dates, and a measurement memo." }
    ]
  },
  {
    id: "delivery",
    label: "Delivery",
    description: "Track execution, dependencies, rollout safety, launch, and enablement.",
    steps: [
      { id: "board", space: "delivery", mode: "board", target: "active-mode", title: "Delivery board", description: "Monitor committed work, readiness, blockers, overdue items, milestones, and a delivery memo." },
      { id: "dependencies", space: "delivery", mode: "dependencies", target: "active-mode", title: "Dependencies", description: "Review active blockers, urgency, target work, owner load, upcoming commitments, and escalation-ready dependency notes." },
      { id: "readiness", space: "delivery", mode: "readiness", target: "active-mode", title: "Rollout readiness", description: "Plan staged exposure, audiences, guardrails, rollback triggers, watch-list gaps, and a rollout memo." },
      { id: "launch", space: "delivery", mode: "launch", target: "active-mode", title: "Launch", description: "Assess readiness, gaps, risks, and go, watch, or no-go state before committing to a launch." },
      { id: "enablement", space: "delivery", mode: "enablement", target: "active-mode", title: "Enablement", description: "Prepare docs, support handoff, customer-facing teams, training, analytics, and a launch handoff memo." }
    ]
  },
  {
    id: "briefings",
    label: "Briefings",
    description: "Turn workspace state into decisions, communication, reviews, and reusable artifacts.",
    steps: [
      { id: "executive", space: "briefings", mode: "executive", target: "active-mode", title: "Executive", description: "Generate a leadership-ready brief covering priorities, risks, rollout, decisions, measurement gaps, themes, and concrete asks." },
      { id: "updates", space: "briefings", mode: "updates", target: "active-mode", title: "Updates", description: "Create stakeholder updates and release notes from current portfolio state without rewriting the source work." },
      { id: "stakeholders", space: "briefings", mode: "stakeholders", target: "active-mode", title: "Stakeholders", description: "Review owner load, segment attention, open asks, escalations, and stakeholder-ready governance notes." },
      { id: "escalations", space: "briefings", mode: "escalations", target: "active-mode", title: "Escalations", description: "Collect critical risks, watch-list issues, ownership gaps, mitigation asks, and an escalation memo." },
      { id: "comms", space: "briefings", mode: "comms", target: "active-mode", title: "Comms", description: "Plan communication by audience, cadence, message, risks, and asks, then copy the resulting memo." },
      { id: "meetings", space: "briefings", mode: "meetings", target: "active-mode", title: "Meetings", description: "Generate focused agendas for recurring reviews, triage, launches, and other product rituals." },
      { id: "decisions", space: "briefings", mode: "decisions", target: "active-mode", title: "Decisions", description: "Keep risks, experiments, and explicit calls together so product decisions remain traceable." },
      { id: "review", space: "briefings", mode: "review", target: "active-mode", title: "Review", description: "Close the loop on shipped work, slipped commitments, decision needs, learnings, and follow-ups." },
      { id: "retros", space: "briefings", mode: "retros", target: "active-mode", title: "Retros", description: "Turn delivery outcomes, misses, follow-ups, and activity into retrospective prompts and a memo." },
      { id: "operations", space: "briefings", mode: "operations", target: "active-mode", title: "Operations", description: "Review risk, stakeholder, cadence, backlog hygiene, and weekly planning recommendations in one operating view." },
      { id: "specs", space: "briefings", mode: "specs", target: "active-mode", title: "Specs", description: "Generate product requirement and specification drafts directly from an initiative's current context." },
      { id: "templates", space: "briefings", mode: "templates", target: "active-mode", title: "Templates", description: "Use reusable Markdown templates for weekly reviews, launches, decisions, PRDs, and other PM rituals." }
    ]
  },
  {
    id: "team",
    label: "Team",
    description: "Connect product ownership, organization structure, and workload.",
    steps: [
      { id: "organization", space: "team", mode: "organization", target: "active-mode", title: "Organization", description: "Model a single product hierarchy, assign active leads, inspect workload, and connect every initiative to an exact unit." },
      { id: "people", space: "team", mode: "people", target: "active-mode", title: "People", description: "Maintain the people directory, point-of-contact ownership, roles, team placement, and individual workload." }
    ]
  },
  {
    id: "settings",
    label: "Settings",
    description: "Control data ownership, workflow, planning cadence, prioritization, and history.",
    steps: [
      { id: "data", space: "settings", mode: "data", target: "active-mode", title: "Data and sync", description: "Choose Browser, guarded Google Drive, or optional Team storage; import and export portable files; manage recovery snapshots, members, invites, and local-only usage." },
      { id: "workflow", space: "settings", mode: "workflow", target: "active-mode", title: "Workflow", description: "Configure the ordered initiative stages and their stable reporting categories while protecting stages that are still in use." },
      { id: "calendar", space: "settings", mode: "calendar", target: "active-mode", title: "Planning calendar", description: "Enable sprint, month, fiscal quarter, and fiscal year layers and configure the cadence used by shared timeline scope." },
      { id: "prioritization", space: "settings", mode: "prioritization", target: "active-mode", title: "Prioritization", description: "Choose the workspace method, define priority levels or bounded custom scorecards, and set exact-team board overrides." },
      { id: "activity", space: "settings", mode: "activity", target: "active-mode", title: "Activity", description: "Review the auditable change trail and copy a concise digest of recent workspace activity." }
    ]
  }
];

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export const TUTORIAL_GROUPS = deepFreeze(groupDefinitions);

export function tutorialGroup(groupId) {
  return TUTORIAL_GROUPS.find((group) => group.id === groupId) || null;
}

export function tutorialStepCount() {
  return TUTORIAL_GROUPS.reduce((total, group) => total + group.steps.length, 0);
}

export function emptyTutorialProgress() {
  return { schema: "pm-os.tutorial.v1", introduced: false, groups: {} };
}

export function normalizeTutorialProgress(value) {
  const normalized = emptyTutorialProgress();
  if (!value || Array.isArray(value) || typeof value !== "object") return normalized;
  if (value.schema !== "pm-os.tutorial.v1") return normalized;
  normalized.introduced = value.introduced === true;
  const groups = value.groups && !Array.isArray(value.groups) && typeof value.groups === "object" ? value.groups : {};
  for (const group of TUTORIAL_GROUPS) {
    const entry = groups[group.id];
    if (!entry || Array.isArray(entry) || typeof entry !== "object") continue;
    if (entry.complete === true) {
      normalized.groups[group.id] = { nextStep: 0, complete: true };
      continue;
    }
    if (!Number.isInteger(entry.nextStep)) continue;
    normalized.groups[group.id] = {
      nextStep: Math.max(0, Math.min(group.steps.length - 1, entry.nextStep)),
      complete: false
    };
  }
  return normalized;
}

export function loadTutorialProgress(storage) {
  try {
    return normalizeTutorialProgress(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY) || "null"));
  } catch {
    return emptyTutorialProgress();
  }
}

export function saveTutorialProgress(storage, progress) {
  const normalized = normalizeTutorialProgress({ ...progress, schema: "pm-os.tutorial.v1" });
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function tutorialGroupStatus(progress, groupId) {
  const entry = normalizeTutorialProgress(progress).groups[groupId];
  if (entry?.complete) return "complete";
  if (entry) return "in-progress";
  return "not-started";
}

export function recommendedTutorialGroup(progress) {
  const normalized = normalizeTutorialProgress(progress);
  const inProgress = TUTORIAL_GROUPS.find((group) => normalized.groups[group.id] && !normalized.groups[group.id].complete);
  if (inProgress) return inProgress;
  return TUTORIAL_GROUPS.find((group) => !normalized.groups[group.id]?.complete) || null;
}

export function updateTutorialGroupProgress(progress, groupId, patch) {
  const group = tutorialGroup(groupId);
  if (!group) return normalizeTutorialProgress(progress);
  const normalized = normalizeTutorialProgress(progress);
  const current = normalized.groups[groupId] || { nextStep: 0, complete: false };
  normalized.groups[groupId] = {
    nextStep: Math.max(0, Math.min(group.steps.length - 1, Number.isInteger(patch?.nextStep) ? patch.nextStep : current.nextStep)),
    complete: patch?.complete === true || (patch?.complete !== false && current.complete)
  };
  if (normalized.groups[groupId].complete) normalized.groups[groupId].nextStep = 0;
  return normalized;
}

export function shouldAutoStartTutorial({ demoMode = false, storage, priorKeys = [] } = {}) {
  if (demoMode) return false;
  const progress = loadTutorialProgress(storage);
  if (progress.introduced || Object.keys(progress.groups).length) return false;
  try {
    return !priorKeys.some((key) => storage.getItem(key) !== null);
  } catch {
    return false;
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function computeCoachmarkPlacement(anchor, card, viewport, options = {}) {
  const margin = Number(options.margin) || 16;
  const gap = Number(options.gap) || 14;
  const topInset = Math.max(margin, Number(options.topInset) || margin);
  const width = Math.min(card.width, Math.max(0, viewport.width - (margin * 2)));
  const height = Math.min(card.height, Math.max(0, viewport.height - topInset - margin));
  if (!anchor) {
    return {
      placement: "center",
      left: Math.round((viewport.width - width) / 2),
      top: Math.round(topInset + ((viewport.height - topInset - margin - height) / 2))
    };
  }
  if (options.mobile) {
    const bottomInset = Number(options.bottomInset) || 88;
    const bottomTop = viewport.height - bottomInset - height;
    const targetOverlapsBottom = anchor.bottom + gap > bottomTop;
    return {
      placement: targetOverlapsBottom ? "mobile-top" : "mobile-bottom",
      left: Math.round((viewport.width - width) / 2),
      top: Math.round(clamp(targetOverlapsBottom ? margin : bottomTop, margin, viewport.height - height - margin))
    };
  }
  const candidates = [
    { placement: "right", fits: viewport.width - anchor.right - gap >= width, left: anchor.right + gap, top: anchor.top + ((anchor.height - height) / 2) },
    { placement: "left", fits: anchor.left - gap >= width, left: anchor.left - width - gap, top: anchor.top + ((anchor.height - height) / 2) },
    { placement: "bottom", fits: viewport.height - anchor.bottom - gap >= height, left: anchor.left + ((anchor.width - width) / 2), top: anchor.bottom + gap },
    { placement: "top", fits: anchor.top - gap - topInset >= height, left: anchor.left + ((anchor.width - width) / 2), top: anchor.top - height - gap }
  ];
  const selected = candidates.find((candidate) => candidate.fits) || { placement: "center", left: (viewport.width - width) / 2, top: topInset + ((viewport.height - topInset - margin - height) / 2) };
  return {
    placement: selected.placement,
    left: Math.round(clamp(selected.left, margin, viewport.width - width - margin)),
    top: Math.round(clamp(selected.top, topInset, viewport.height - height - margin))
  };
}
