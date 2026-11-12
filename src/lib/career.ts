/**
 * Career Coach data service backed by GET /api/v1/career/latest.
 *
 * Maps the backend response onto the shape the existing Coach page renders,
 * with safe fallbacks so every section keeps rendering when fields are missing.
 */
import { apiRequest, ApiError, getStoredToken } from "./api";

export type Strength = {
  title: string;
  icon: string;
  explanation: string;
  evidence: string;
};

export type SkillGap = {
  skill: string;
  why: string;
  impact: string;
};

export type RoadmapStep = {
  stage: string;
  role: string;
  actions: string[];
};

export type Recommendation = {
  role: string;
  match: number;
  why: string;
  required: string[];
  improve: string;
};

export type EvidenceItem = {
  icon: string;
  label: string;
  value: string;
  detail: string;
};

export type ExplanationItem = {
  role: string;
  why: string;
  badges: string[];
};

export type CareerCoachData = {
  career_level: string;
  readiness_score: number;
  summary: string;
  strengths: Strength[];
  current_skills: string[];
  skill_gaps: SkillGap[];
  roadmap: RoadmapStep[];
  action_plan: string[];
  interview_topics: string[];
  recommendations: Recommendation[];
  reasoning: {
    evidence: EvidenceItem[];
    reasoning: string[];
    explanations: ExplanationItem[];
  };
};

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function pick(source: Raw | null, ...keys: string[]): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    const v = source[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(100, n))) : fallback;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Backends often nest the payload under `data`, `result`, `career`, `coach` or `analysis`. */
function unwrap(raw: unknown): Raw | null {
  const root = obj(raw);
  if (!root) return null;
  let merged: Raw = { ...root };
  for (const key of ["data", "result", "career", "coach", "analysis", "payload"]) {
    const nested = obj(root[key]);
    if (nested) merged = { ...nested, ...merged, ...nested };
  }
  return merged;
}

function mapStrengths(value: unknown): Strength[] {
  return arr(value)
    .map((s) => {
      if (typeof s === "string") {
        return { title: s, icon: "award", explanation: "", evidence: "" };
      }
      const o = obj(s);
      if (!o) return null;
      const title = str(pick(o, "title", "name", "strength", "skill"));
      return title
        ? {
            title,
            icon: str(pick(o, "icon"), "award"),
            explanation: str(pick(o, "explanation", "description", "detail")),
            evidence: str(pick(o, "evidence", "proof", "source")),
          }
        : null;
    })
    .filter((s): s is Strength => Boolean(s));
}

function mapSkillGaps(value: unknown): SkillGap[] {
  return arr(value)
    .map((g) => {
      if (typeof g === "string") {
        return { skill: g, why: "", impact: "" };
      }
      const o = obj(g);
      if (!o) return null;
      const skill = str(pick(o, "skill", "name", "title", "gap"));
      return skill
        ? {
            skill,
            why: str(pick(o, "why", "reason", "description")),
            impact: str(pick(o, "impact", "effect", "value")),
          }
        : null;
    })
    .filter((g): g is SkillGap => Boolean(g));
}

function mapRoadmap(value: unknown): RoadmapStep[] {
  return arr(value)
    .map((step) => {
      const o = obj(step);
      if (!o) return null;
      const stage = str(pick(o, "stage", "timeline", "phase", "period"), "Next step");
      const role = str(pick(o, "role", "title", "position", "target_role"), "");
      const actions = arr(pick(o, "actions", "steps", "tasks", "milestones"))
        .map((a) =>
          typeof a === "string" ? a : str(pick(obj(a), "action", "text", "description", "step")),
        )
        .filter(Boolean);
      return { stage, role, actions };
    })
    .filter((s): s is RoadmapStep => Boolean(s));
}

function mapActionPlan(value: unknown): string[] {
  return arr(value)
    .map((a) => {
      if (typeof a === "string") return a;
      const o = obj(a);
      return o ? str(pick(o, "action", "task", "text", "description", "step")) : "";
    })
    .filter(Boolean);
}

function mapInterviewTopics(value: unknown): string[] {
  return arr(value)
    .map((t) => {
      if (typeof t === "string") return t;
      const o = obj(t);
      if (!o) return "";
      return str(pick(o, "topic", "question", "subject", "category", "text"));
    })
    .filter(Boolean);
}

function mapRecommendations(value: unknown): Recommendation[] {
  return arr(value)
    .map((r) => {
      if (typeof r === "string") {
        return { role: r, match: 0, why: "", required: [], improve: "" };
      }
      const o = obj(r);
      if (!o) return null;
      const role = str(pick(o, "role", "title", "name", "job_title"));
      if (!role) return null;
      const required = arr(pick(o, "required", "required_skills", "skills"))
        .map((s) => (typeof s === "string" ? s : str(pick(obj(s), "name", "skill", "title"))))
        .filter(Boolean);
      return {
        role,
        match: num(pick(o, "match", "match_score", "score", "fit_score")),
        why: str(pick(o, "why", "reason", "explanation", "rationale")),
        required,
        improve: str(pick(o, "improve", "improvement", "next_step", "gap")),
      };
    })
    .filter((r): r is Recommendation => Boolean(r));
}

function mapEvidence(value: unknown): EvidenceItem[] {
  return arr(value)
    .map((e) => {
      const o = obj(e);
      if (!o) return null;
      const label = str(pick(o, "label", "name", "title", "type"));
      return label
        ? {
            icon: str(pick(o, "icon"), "briefcase"),
            label,
            value: str(pick(o, "value", "amount", "count", "summary")),
            detail: str(pick(o, "detail", "description", "context")),
          }
        : null;
    })
    .filter((e): e is EvidenceItem => Boolean(e));
}

function mapExplanations(value: unknown): ExplanationItem[] {
  return arr(value)
    .map((e) => {
      const o = obj(e);
      if (!o) return null;
      const role = str(pick(o, "role", "title", "name", "job_title"));
      if (!role) return null;
      const badges = arr(pick(o, "badges", "skills", "tags"))
        .map((b) => (typeof b === "string" ? b : str(pick(obj(b), "name", "skill", "title"))))
        .filter(Boolean);
      return {
        role,
        why: str(pick(o, "why", "reason", "explanation", "rationale")),
        badges,
      };
    })
    .filter((e): e is ExplanationItem => Boolean(e));
}

function mapReasoning(raw: unknown): CareerCoachData["reasoning"] {
  const o = obj(raw);
  if (!o) {
    return { evidence: [], reasoning: [], explanations: [] };
  }
  return {
    evidence: mapEvidence(pick(o, "evidence", "resume_evidence", "signals")),
    reasoning: arr(pick(o, "reasoning", "reasoning_steps", "steps", "logic"))
      .map((s) => (typeof s === "string" ? s : str(pick(obj(s), "text", "description", "step"))))
      .filter(Boolean),
    explanations: mapExplanations(
      pick(o, "explanations", "recommendation_explanations", "matches"),
    ),
  };
}

export function mapCareerCoach(raw: unknown): CareerCoachData {
  const src = unwrap(raw) ?? {};

  const strengths = mapStrengths(
    pick(src, "strengths", "strength_areas", "professional_strengths"),
  );
  const skillGaps = mapSkillGaps(
    pick(src, "skill_gaps", "skill_gaps_analysis", "missing_skills", "skills_to_develop"),
  );
  const roadmap = mapRoadmap(
    pick(src, "roadmap", "career_path", "career_roadmap", "career_pathway", "stages"),
  );
  const actionPlan = mapActionPlan(
    pick(
      src,
      "action_plan",
      "action_items",
      "job_search_strategy",
      "preparation_plan",
      "next_steps",
    ),
  );
  const interviewTopics = mapInterviewTopics(
    pick(src, "interview_topics", "interview_questions", "interview_prep", "preparation_topics"),
  );
  const recommendations = mapRecommendations(
    pick(
      src,
      "recommendations",
      "recommended_roles",
      "recommended_paths",
      "recommended_career_paths",
    ),
  );

  const currentSkills = arr(
    pick(src, "current_skills", "skills", "technical_skills", "core_skills"),
  )
    .map((s) => (typeof s === "string" ? s : str(pick(obj(s), "name", "skill", "title"))))
    .filter(Boolean);

  const readiness =
    pick(src, "readiness_score", "career_readiness_score", "readiness", "score") ??
    pick(src, "interview_readiness_score");

  const reasoningRaw = pick(src, "reasoning", "explainable_ai", "ai_reasoning");

  return {
    career_level: str(
      pick(src, "career_level", "career_direction", "current_level", "seniority"),
      "Professional",
    ),
    readiness_score: num(readiness),
    summary: str(
      pick(src, "summary", "ai_summary", "career_advice", "final_advice", "overview"),
      "",
    ),
    strengths,
    current_skills: currentSkills,
    skill_gaps: skillGaps,
    roadmap,
    action_plan: actionPlan,
    interview_topics: interviewTopics,
    recommendations,
    reasoning: mapReasoning(reasoningRaw),
  };
}

/** GET /api/v1/career/latest */
export async function fetchLatestCareerCoach(): Promise<CareerCoachData> {
  const token = getStoredToken();
  if (!token) {
    throw new ApiError("Please sign in to view your career coach.", 401);
  }
  const data = await apiRequest<unknown>("/api/v1/career/latest", {
    method: "GET",
    auth: true,
    headers: { Authorization: `Bearer ${token}` },
  });
  return mapCareerCoach(data);
}
