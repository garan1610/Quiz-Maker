export type Choice = { id: string; sourceLabel: string; text: string };
export type Question = {
  id: string;
  section: string;
  type: "single_choice" | "multiple_choice";
  text: string;
  choices: Choice[];
  correctChoiceIds: string[];
  explanation: string;
  source_page?: number;
  answerShuffleSafe: boolean;
  reviewIssues: string[];
};
export type QuizBank = {
  title: string;
  questions: Question[];
};
export type Project = { id: string; bank: QuizBank; settings?: Settings; progress?: SavedSession; publicId?: string };
export type Settings = {
  sections: string[];
  count: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  mode: "practice" | "exam";
  skipReview?: boolean;
};
export type Attempt = {
  questions: Question[];
  answers: Record<string, string[]>;
  settings: Settings;
};
export type SavedSession = { attempt: Attempt; index: number; selected: string[]; submitted: boolean; finished: boolean; checkedIds: string[] };
export type ParseResult = { bank: QuizBank; errors: [] } | { bank: null; errors: string[] };

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

// Choice-relative wording makes rearrangement unsafe, regardless of an AI's flag.
export function hasOrderDependentChoices(choices: Choice[], stem = ""): boolean {
  return [...choices.map((choice) => choice.text), stem].some((text) =>
    /\b(?:above|below|preceding|following options|both\s+[A-Z]\s+(?:and|&)\s+[A-Z])\b|\b[A-Z]\b\s*(?:and|or|&)\s*\b[A-Z]\b|\b(?:option|answer|choice)\s+[A-Z]\b|(?:tất cả|cả|các).{0,45}(?:trên|dưới)|\b[A-Z]\s+(?:và|hoặc)\s+[A-Z]\b/iu.test(text),
  );
}

// Validate the one supported file format and generate internal IDs.
function validateBank(data: Record<string, unknown>): ParseResult {
  const errors: string[] = [];
  if (data.schemaVersion !== 2) return { bank: null, errors: ["schemaVersion must be 2."] };
  if (!nonempty(data.title)) errors.push("title must be a non-empty string.");
  if (!Array.isArray(data.questions) || !data.questions.length || data.questions.length > 2000)
    return { bank: null, errors: ["questions must contain between 1 and 2,000 questions."] };
  const questions: Question[] = [];
  data.questions.forEach((raw, index) => {
    const errorCount = errors.length;
    const prefix = `Question ${index + 1}`;
    if (!object(raw)) { errors.push(`${prefix}: must be an object.`); return; }
    if (typeof raw.section !== "string") errors.push(`${prefix}: section must be a string.`);
    if (!nonempty(raw.question)) errors.push(`${prefix}: question text is missing.`);
    if (raw.explanation !== undefined && typeof raw.explanation !== "string") errors.push(`${prefix}: explanation must be a string.`);
    if (raw.source_page !== undefined && (!Number.isSafeInteger(raw.source_page) || Number(raw.source_page) < 1))
      errors.push(`${prefix}: source_page must be a positive integer page number.`);
    if (raw.answerShuffleSafe !== undefined && typeof raw.answerShuffleSafe !== "boolean")
      errors.push(`${prefix}: answerShuffleSafe must be true or false.`);
    if (raw.reviewIssues !== undefined && !strings(raw.reviewIssues)) errors.push(`${prefix}: reviewIssues must be an array of strings.`);
    const entries = object(raw.answers) ? Object.entries(raw.answers) : [];
    if (entries.length < 2 || entries.length > 26 || entries.some(([label, text]) => !/^[A-Z]$/.test(label) || !nonempty(text)))
      errors.push(`${prefix}: answers must contain 2–26 letter keys (A–Z) with non-empty text.`);
    // Letter keys preserve the original mapping used by explanations; sort A–Z even if JSON keys arrive out of order.
    entries.sort(([a], [b]) => a.localeCompare(b));
    const id = String(index + 1);
    const choices = entries.map(([label, text], i) => ({ id: `${id}_${i + 1}`, sourceLabel: label, text: text as string }));
    if (!strings(raw.correct_answers) || new Set(raw.correct_answers).size !== raw.correct_answers.length
      || raw.correct_answers.some((label) => !entries.some(([key]) => key === label)))
      errors.push(`${prefix}: correct_answers must contain unique answer letters that exist in answers.`);
    const correct = strings(raw.correct_answers) ? raw.correct_answers : [];
    if (errors.length !== errorCount) return;
    const issues = strings(raw.reviewIssues) ? raw.reviewIssues.filter((issue) => issue.trim()) : [];
    if (!correct.length && !issues.includes("Correct answer missing.")) issues.push("Correct answer missing.");
    questions.push({
      id, section: raw.section as string, text: raw.question as string, choices,
      type: correct.length > 1 ? "multiple_choice" : "single_choice",
      correctChoiceIds: choices.filter((c) => correct.includes(c.sourceLabel)).map((c) => c.id),
      explanation: (raw.explanation as string | undefined) ?? "",
      ...(raw.source_page === undefined ? {} : { source_page: raw.source_page as number }),
      answerShuffleSafe: raw.answerShuffleSafe !== false && !hasOrderDependentChoices(choices, raw.question as string), reviewIssues: issues,
    });
  });
  if (errors.length) return { bank: null, errors };
  return { bank: { title: data.title as string, questions }, errors: [] };
}

export function compactBank(bank: QuizBank) {
  return {
    schemaVersion: 2, title: bank.title,
    questions: bank.questions.map((q) => ({
      section: q.section, question: q.text,
      answers: Object.fromEntries(q.choices.map((c) => [c.sourceLabel, c.text])),
      correct_answers: q.choices.filter((c) => q.correctChoiceIds.includes(c.id)).map((c) => c.sourceLabel),
      ...(q.explanation.trim() ? { explanation: q.explanation } : {}),
      ...(q.source_page === undefined ? {} : { source_page: q.source_page }),
      ...(q.answerShuffleSafe ? {} : { answerShuffleSafe: false }),
      ...(q.reviewIssues.length ? { reviewIssues: q.reviewIssues } : {}),
    })),
  };
}

export function parseBank(raw: string): ParseResult {
  if (raw.length > 5_000_000) return { bank: null, errors: ["This bank is too large. Import a JSON file smaller than 5 MB."] };
  let data: unknown;
  try {
    // Accept one complete Markdown code fence, but never silently repair content.
    const text = raw.replace(/^\uFEFF/, "").trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1");
    data = JSON.parse(text);
  } catch {
    return { bank: null, errors: ["This is not valid JSON. Paste the complete JSON object, or ask your chatbot to fix its formatting."] };
  }
  if (!object(data)) return { bank: null, errors: ["The bank must be a JSON object, not a list or plain text."] };
  return validateBank(data);
}

export function needsReview(question: Question): boolean {
  return question.reviewIssues.length > 0 || question.correctChoiceIds.length === 0;
}

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createAttempt(bank: QuizBank, settings: Settings): Attempt {
  let questions = bank.questions.filter((q) => settings.sections.includes(q.section));
  if (!questions.length) throw new Error("Choose at least one section with questions.");
  if (!settings.skipReview && questions.some(needsReview)) throw new Error("Resolve flagged questions in the selected sections before starting.");
  if (!Number.isInteger(settings.count) || settings.count < 1 || settings.count > questions.length) throw new Error("Choose a valid question count.");
  if (settings.shuffleQuestions) questions = shuffled(questions);
  questions = questions.slice(0, settings.count).map((q) => ({
    ...q,
    choices: settings.shuffleAnswers && q.answerShuffleSafe ? shuffled(q.choices) : [...q.choices],
    correctChoiceIds: [...q.correctChoiceIds], reviewIssues: [...q.reviewIssues],
  }));
  return { questions, answers: Object.fromEntries(questions.map((q) => [q.id, []])), settings: { ...settings, sections: [...settings.sections] } };
}

export function isCorrect(question: Question, selected: readonly string[] = []): boolean {
  return question.correctChoiceIds.length > 0 && selected.length === question.correctChoiceIds.length
    && new Set(selected).size === selected.length
    && selected.every((id) => question.correctChoiceIds.includes(id));
}

export function reviewOrder(attempt: Attempt): Question[] {
  return [...attempt.questions].sort((a, b) => Number(isCorrect(a, attempt.answers[a.id])) - Number(isCorrect(b, attempt.answers[b.id])));
}
