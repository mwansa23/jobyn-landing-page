/**
 * Maps the FastAPI resume-upload response onto the shape the Snapshot page renders.
 * Only fields the backend actually returns are used; anything missing keeps the
 * existing demo placeholder so the layout never breaks.
 */
export type SnapshotData = {
  candidateName: string;
  headline: string;
  careerLevel: { label: string; tier: string; progress: number };
  atsScore: number;
  completeness: number;
  confidence: number;
  topSkills: string[];
  missingSkills: string[];
  recommendedRoles: { title: string; match: number }[];
  aiSummary: string;
  strengths: string[];
  improvements: string[];
  nextAction: string;
};

type Raw = Record<string, unknown>;

function pick(source: Raw | null, ...keys: string[]): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") {
        const named = v as { name?: unknown; skill?: unknown; title?: unknown };
        return String(named.name ?? named.skill ?? named.title ?? "");
      }
      return "";
    })
    .filter(Boolean);
  return items.length ? items : undefined;
}

function asRoles(value: unknown): { title: string; match: number }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const roles = value
    .map((v) => {
      if (typeof v === "string") return { title: v, match: 0 };
      if (v && typeof v === "object") {
        const r = v as Raw;
        const title = String(r["title"] ?? r["role"] ?? r["name"] ?? "");
        const match = Number(r["match"] ?? r["match_score"] ?? r["score"] ?? 0);
        return title ? { title, match: Number.isFinite(match) ? Math.round(match) : 0 } : null;
      }
      return null;
    })
    .filter((r): r is { title: string; match: number } => Boolean(r));
  return roles.length ? roles : undefined;
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Backends often nest the analysis under `analysis`, `data` or `result`. */
function unwrap(raw: unknown): Raw | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Raw;
  for (const key of ["analysis", "snapshot", "result", "data", "parsed", "profile"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return { ...(nested as Raw), ...root };
    }
  }
  return root;
}

export function mergeSnapshot(fallback: SnapshotData, raw: unknown): SnapshotData {
  const src = unwrap(raw);
  if (!src) return fallback;

  const level = pick(src, "career_level", "careerLevel", "seniority");
  const levelLabel =
    typeof level === "string"
      ? level
      : level && typeof level === "object"
        ? String((level as Raw)["label"] ?? fallback.careerLevel.label)
        : undefined;

  return {
    candidateName:
      (pick(src, "full_name", "candidate_name", "name") as string | undefined) ??
      fallback.candidateName,
    headline:
      (pick(src, "headline", "title", "current_role") as string | undefined) ?? fallback.headline,
    careerLevel: {
      label: levelLabel ?? fallback.careerLevel.label,
      tier:
        (pick(src, "career_level_detail", "experience_summary") as string | undefined) ??
        fallback.careerLevel.tier,
      progress:
        asNumber(pick(src, "career_level_progress", "seniority_score")) ??
        fallback.careerLevel.progress,
    },
    atsScore: asNumber(pick(src, "ats_score", "atsScore")) ?? fallback.atsScore,
    completeness:
      asNumber(pick(src, "completeness", "resume_completeness", "completeness_score")) ??
      fallback.completeness,
    confidence: asNumber(pick(src, "confidence", "confidence_score")) ?? fallback.confidence,
    topSkills:
      asStringArray(pick(src, "top_skills", "skills", "extracted_skills")) ?? fallback.topSkills,
    missingSkills:
      asStringArray(pick(src, "missing_skills", "skill_gaps")) ?? fallback.missingSkills,
    recommendedRoles:
      asRoles(pick(src, "recommended_roles", "recommended_job_titles", "roles")) ??
      fallback.recommendedRoles,
    aiSummary:
      (pick(src, "ai_summary", "summary", "professional_summary") as string | undefined) ??
      fallback.aiSummary,
    strengths: asStringArray(pick(src, "strengths", "strength_areas")) ?? fallback.strengths,
    improvements:
      asStringArray(pick(src, "improvements", "improvement_opportunities", "weaknesses")) ??
      fallback.improvements,
    nextAction:
      (pick(src, "next_action", "suggested_next_action") as string | undefined) ??
      fallback.nextAction,
  };
}
