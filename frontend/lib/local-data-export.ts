import { loadGamification } from "./gamification";
import { loadJournal } from "./journal";
import { loadSnapshots } from "./profile-history";
import {
  loadAnswers,
  loadConsent,
  loadOnboarding,
  loadResult,
} from "./session";
import { getYouthUserId } from "./youth-user-id";

/** JSON snapshot of everything stored on this device (session + localStorage). */
export function buildDeviceDataExport(): Record<string, unknown> {
  return {
    export_schema: "youth-dev-ai/device/1",
    exported_at: new Date().toISOString(),
    youth_user_id: getYouthUserId(),
    onboarding: loadOnboarding(),
    consent: loadConsent(),
    answers: loadAnswers(),
    latest_profile_result: loadResult(),
    profile_snapshots: loadSnapshots(),
    gamification: loadGamification(),
    journal: loadJournal(),
  };
}

export function downloadJson(filename: string, data: unknown) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadDeviceDataExport() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadJson(`youth-dev-device-export-${stamp}.json`, buildDeviceDataExport());
}
