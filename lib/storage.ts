import { compactBank, parseBank, type Project, type SavedSession, type Settings } from "./quiz.ts";

export type Workspace = { version: 2; projects: Project[]; activeId: string | null; view: "library" | "project" | "study" | "results" };
export const emptyWorkspace = (): Workspace => ({ version: 2, projects: [], activeId: null, view: "library" });
export const WORKSPACE_KEY = "recall.workspace.v2";
export const LANGUAGE_KEY = "recall.language";

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const stringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
function validSettings(v: unknown): v is Settings {
  return record(v) && stringArray(v.sections) && Number.isInteger(v.count) && Number(v.count) > 0
    && typeof v.shuffleQuestions === "boolean" && typeof v.shuffleAnswers === "boolean" && (v.mode === "practice" || v.mode === "exam")
    && (v.skipReview === undefined || typeof v.skipReview === "boolean");
}

function restoreProgress(raw: unknown, project: Project): SavedSession | undefined {
  if (!record(raw) || !record(raw.attempt) || !Array.isArray(raw.attempt.questionOrder) || !record(raw.attempt.answers)
    || !validSettings(raw.attempt.settings) || !Number.isInteger(raw.index) || typeof raw.submitted !== "boolean"
    || typeof raw.finished !== "boolean" || !stringArray(raw.selected) || !stringArray(raw.checkedIds)) return;
  const questions = [];
  const seen = new Set<string>();
  for (const entry of raw.attempt.questionOrder) {
    if (!record(entry) || typeof entry.id !== "string" || seen.has(entry.id) || !stringArray(entry.choiceIds)) return;
    seen.add(entry.id);
    const original = project.bank.questions.find((q) => q.id === entry.id);
    if (!original || entry.choiceIds.length !== original.choices.length || new Set(entry.choiceIds).size !== entry.choiceIds.length) return;
    const choices = entry.choiceIds.map((id) => original.choices.find((c) => c.id === id));
    if (choices.some((c) => !c)) return;
    questions.push({ ...original, choices: choices as typeof original.choices });
  }
  if (!questions.length || Number(raw.index) < 0 || Number(raw.index) >= questions.length) return;
  const answers = raw.attempt.answers;
  for (const q of questions) {
    const answer = answers[q.id];
    if (!Object.hasOwn(answers, q.id) || !stringArray(answer) || new Set(answer).size !== answer.length
      || answer.some((id) => !q.choices.some((c) => c.id === id)) || (q.type === "single_choice" && answer.length > 1)) return;
  }
  const current = questions[Number(raw.index)];
  if (new Set(raw.selected).size !== raw.selected.length || raw.selected.some((id) => !current.choices.some((c) => c.id === id))) return;
  if (current.type === "single_choice" && raw.selected.length > 1) return;
  if (new Set(raw.checkedIds).size !== raw.checkedIds.length || raw.checkedIds.some((id) => !seen.has(id) || !Array.isArray(answers[id]) || !answers[id].length)) return;
  if (raw.attempt.settings.mode === "exam" && (raw.checkedIds.length || raw.submitted)) return;
  if (!raw.finished && raw.submitted !== raw.checkedIds.includes(current.id)) return;
  if (raw.submitted && (!raw.selected.length || JSON.stringify(raw.selected) !== JSON.stringify(answers[current.id]))) return;
  return { attempt: { questions, answers: answers as Record<string, string[]>, settings: raw.attempt.settings },
    index: Number(raw.index), selected: raw.selected, submitted: raw.submitted, finished: raw.finished, checkedIds: raw.checkedIds };
}

export function restoreWorkspace(raw: unknown): Workspace {
  if (raw === undefined) return emptyWorkspace();
  if (!record(raw) || raw.version !== 2 || !Array.isArray(raw.projects)) throw new Error("Invalid saved workspace.");
  const seen = new Set<string>();
  const projects = raw.projects.map((entry): Project => {
    if (!record(entry) || typeof entry.id !== "string" || !entry.id || seen.has(entry.id)) throw new Error("Invalid saved project.");
    seen.add(entry.id);
    const parsed = parseBank(JSON.stringify(entry.bank));
    if (!parsed.bank) throw new Error("Invalid saved question bank.");
    const project: Project = { id: entry.id, bank: parsed.bank };
    if (validSettings(entry.settings)) project.settings = entry.settings;
    if (typeof entry.publicId === "string") project.publicId = entry.publicId;
    if (entry.progress !== undefined) {
      project.progress = restoreProgress(entry.progress, project);
      if (!project.progress) throw new Error("Invalid saved study session.");
    }
    return project;
  });
  const active = projects.find((p) => p.id === raw.activeId);
  const view = raw.view === "study" && active?.progress && !active.progress.finished ? "study"
    : raw.view === "results" && active?.progress?.finished ? "results"
    : raw.view !== "library" && active ? "project" : "library";
  return { version: 2, projects, activeId: active?.id ?? null, view };
}

export function loadWorkspace(): Workspace {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  return restoreWorkspace(raw === null ? undefined : JSON.parse(raw));
}

// Store the bank once; an attempt only needs its question/choice ordering and answers.
export function serializeWorkspace(value: Workspace): string {
  return JSON.stringify({ ...value, projects: value.projects.map((project) => {
    const savedProject = { ...project, bank: compactBank(project.bank) };
    if (!project.progress) return savedProject;
    const { questions, ...attempt } = project.progress.attempt;
    return { ...savedProject, progress: { ...project.progress, attempt: { ...attempt, questionOrder: questions.map((q) => ({ id: q.id, choiceIds: q.choices.map((c) => c.id) })) } } };
  }) });
}

export function saveWorkspace(value: Workspace): void {
  // setItem is atomic: if quota is exceeded, the previous saved value remains intact.
  localStorage.setItem(WORKSPACE_KEY, serializeWorkspace(value));
}

export function readLanguage(): "en" | "vi" {
  try { return localStorage.getItem(LANGUAGE_KEY) === "vi" ? "vi" : "en"; }
  catch { return "en"; }
}

export function saveLanguage(language: "en" | "vi") {
  localStorage.setItem(LANGUAGE_KEY, language);
}
