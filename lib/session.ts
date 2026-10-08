import type { SavedSession } from "./quiz.ts";

export function checkedQuestions(session: SavedSession): string[] {
  return session.checkedIds;
}

export function navigateSession(session: SavedSession, index: number): SavedSession {
  if (!Number.isInteger(index) || index < 0 || index >= session.attempt.questions.length) return session;
  const checkedIds = checkedQuestions(session);
  const current = session.attempt.questions[session.index];
  const answers = { ...session.attempt.answers, [current.id]: [...session.selected] };
  const target = session.attempt.questions[index];
  return { ...session, attempt: { ...session.attempt, answers }, checkedIds, index,
    selected: [...answers[target.id]], submitted: session.attempt.settings.mode === "practice" && checkedIds.includes(target.id) };
}

export function selectSessionAnswer(session: SavedSession, id: string): SavedSession {
  const question = session.attempt.questions[session.index];
  if (session.submitted || !question.choices.some((c) => c.id === id)) return session;
  const selected = question.type === "single_choice" ? [id] : session.selected.includes(id) ? session.selected.filter((value) => value !== id) : [...session.selected, id];
  return { ...session, checkedIds: checkedQuestions(session), selected,
    attempt: { ...session.attempt, answers: { ...session.attempt.answers, [question.id]: selected } } };
}
