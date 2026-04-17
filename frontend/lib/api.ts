import type {
  AgeBand,
  CoachApiResponse,
  CoachChatMessage,
  ConsentRecord,
  MeResponse,
  MicroActionResponse,
  ProfileResult,
  StoredAnswer,
  TrendsResponse,
} from "./types";
import { loadConsent } from "./session";
import { getYouthUserId } from "./youth-user-id";

/**
 * Browser: same-origin `/api-proxy` → App Router forwards to `BACKEND_URL` (no CORS, no build-time API URL).
 * Server (RSC/SSR): talks to `BACKEND_URL` or `NEXT_PUBLIC_API_URL` or local default.
 * Set `NEXT_PUBLIC_API_PROXY=false` and `NEXT_PUBLIC_API_URL` to bypass the proxy (browser must match API CORS).
 */
function apiBase(): string {
  const proxyOff = process.env.NEXT_PUBLIC_API_PROXY === "false";
  const backend = (process.env.BACKEND_URL || "").replace(/\/$/, "").trim();
  const pub = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "").trim();

  if (typeof window === "undefined") {
    if (backend) return backend;
    if (pub) return pub;
    return "http://127.0.0.1:8000";
  }
  if (proxyOff) {
    return pub || "http://127.0.0.1:8000";
  }
  return "/api-proxy";
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
      const isBrowser = typeof window !== "undefined";
      const isDev = process.env.NODE_ENV === "development";

      if (isBrowser && isDev) {
        throw new Error(
          "Could not reach the Youth API. Start the backend on port 8000, or set BACKEND_URL in frontend/.env.local. " +
            "From the repo root you can run `npm run dev` (API + web together)."
        );
      }

      if (isBrowser && !isDev) {
        throw new Error(
          "Could not reach the Youth API through this site. On Cloud Run, set **BACKEND_URL** on the **web** service " +
            "to your API base URL (e.g. https://youth-dev-api-….run.app), redeploy the web service — no image rebuild required."
        );
      }

      throw new Error(
        `Could not reach the Youth API (${apiBase()}). Set BACKEND_URL (or NEXT_PUBLIC_API_URL if using direct mode) for server-side calls.`
      );
    }
    throw e;
  }
}

export type HealthResponse = {
  ok: boolean;
  llm_provider: string;
  demo_mode: boolean;
  allow_llm_demo?: boolean;
  openai_key_present?: boolean;
  groq_key_present?: boolean;
  /** When Groq wins but OpenAI key also exists — how to force OpenAI. */
  llm_routing_hint?: string | null;
  openai_moderation_configured: boolean;
  database_configured: boolean;
  retention_maintenance_configured?: boolean;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await apiFetch(`${apiBase()}/health`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<HealthResponse>;
}

function consentToApi(c: ConsentRecord) {
  return {
    accepted_privacy: c.acceptedPrivacy,
    accepted_terms: c.acceptedTerms,
    accepted_ai_processing: c.acceptedAiProcessing,
    guardian_attested: c.guardianAttested,
    accepted_age_capacity: c.acceptedAgeCapacity,
    policy_version_privacy: c.policyVersionPrivacy,
    policy_version_terms: c.policyVersionTerms,
    recorded_at: c.recordedAt,
  };
}

function youthHeaders(): Record<string, string> {
  const id = getYouthUserId();
  if (!id) return {};
  return { "X-Youth-User-Id": id };
}

async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d[0] && typeof (d[0] as { msg?: string }).msg === "string") {
      return (d[0] as { msg: string }).msg;
    }
  } catch {
    /* fall through */
  }
  return raw || `Request failed (${res.status})`;
}

export async function fetchProfile(input: {
  age_band: AgeBand;
  nickname: string | null;
  answers: StoredAnswer[];
  consent?: ConsentRecord | null;
}): Promise<ProfileResult> {
  const consent = input.consent ?? loadConsent();
  if (!consent) {
    throw new Error("Consent is missing. Please complete the consent step first.");
  }

  const res = await apiFetch(`${apiBase()}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...youthHeaders() },
    body: JSON.stringify({
      age_band: input.age_band,
      nickname: input.nickname || null,
      answers: input.answers.map((a) => ({
        question_id: a.questionId,
        mcq_id: a.mcqId,
        text: a.text,
      })),
      consent: consentToApi(consent),
    }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json() as Promise<ProfileResult>;
}

/** In-app Youth Dev assistant — no consent or age; answers questions about the product. */
export async function fetchAppHelpReply(input: {
  messages: CoachChatMessage[];
}): Promise<CoachApiResponse> {
  const res = await apiFetch(`${apiBase()}/api/app-help`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: input.messages,
    }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json() as Promise<CoachApiResponse>;
}

export async function fetchCoachReply(input: {
  age_band: AgeBand;
  nickname: string | null;
  messages: CoachChatMessage[];
  consent?: ConsentRecord | null;
}): Promise<CoachApiResponse> {
  const consent = input.consent ?? loadConsent();
  if (!consent) {
    throw new Error("Consent is missing. Please complete the consent step first.");
  }

  const res = await apiFetch(`${apiBase()}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...youthHeaders() },
    body: JSON.stringify({
      age_band: input.age_band,
      nickname: input.nickname || null,
      messages: input.messages,
      consent: consentToApi(consent),
    }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json() as Promise<CoachApiResponse>;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await apiFetch(`${apiBase()}/api/me`, {
    headers: { ...youthHeaders() },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<MeResponse>;
}

/** Same as fetchMe but aborts after timeout; returns null on error, non-OK, or no database. */
export async function fetchMeWithTimeout(timeoutMs = 8000): Promise<MeResponse | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await apiFetch(`${apiBase()}/api/me`, {
      headers: { ...youthHeaders() },
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    return res.json() as Promise<MeResponse>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Full cloud-side portable export when sync is on. Requires `X-Youth-User-Id`. */
export async function fetchMeExportBlob(): Promise<Blob> {
  const res = await apiFetch(`${apiBase()}/api/me/export`, {
    headers: { ...youthHeaders() },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.blob();
}

export async function fetchTrends(): Promise<TrendsResponse> {
  const res = await apiFetch(`${apiBase()}/api/me/trends`, {
    headers: { ...youthHeaders() },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<TrendsResponse>;
}

export async function postMicroActionDone(): Promise<MicroActionResponse> {
  const res = await apiFetch(`${apiBase()}/api/me/micro-action`, {
    method: "POST",
    headers: { ...youthHeaders() },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<MicroActionResponse>;
}

export async function deleteServerUserData(): Promise<{ had_server_rows: boolean }> {
  const res = await apiFetch(`${apiBase()}/api/me/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...youthHeaders() },
    body: JSON.stringify({ confirm: "delete_my_server_data" }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const j = (await res.json()) as { had_server_rows?: boolean };
  return { had_server_rows: Boolean(j.had_server_rows) };
}

export async function postJournal(input: {
  age_band: AgeBand;
  prompt_id: string;
  text: string;
  consent?: ConsentRecord | null;
}): Promise<void> {
  const consent = input.consent ?? loadConsent();
  if (!consent) {
    throw new Error("Consent is missing. Please complete the consent step first.");
  }
  const res = await apiFetch(`${apiBase()}/api/journal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...youthHeaders() },
    body: JSON.stringify({
      age_band: input.age_band,
      prompt_id: input.prompt_id,
      text: input.text,
      consent: consentToApi(consent),
    }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}
