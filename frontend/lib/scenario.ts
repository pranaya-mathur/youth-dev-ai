import type { Question } from "./assessment-data";
import type { AgeBand } from "./types";

export function scenarioForBand(q: Question, age: AgeBand | null): string {
  if (age === "11-13" && q.scenarioYoung) return q.scenarioYoung;
  return q.scenario;
}
