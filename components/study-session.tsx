"use client";
import { useLanguage } from "./language";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createAttempt, isCorrect, reviewOrder, type Attempt, type QuizBank, type SavedSession } from "@/lib/quiz";
import { checkedQuestions, navigateSession, selectSessionAnswer } from "@/lib/session";
import { AnswerReview, Icon, Modal } from "./ui";
export function StudySession({ progress, onProgress, bank, onFinish, onExit }: {
    progress: SavedSession;
    onProgress: (progress: SavedSession) => void;
    bank: QuizBank;
    onFinish: (attempt: Attempt) => void;
    onExit: () => void;
}) {
    const { t } = useLanguage();
    const { attempt: initial, index, selected, submitted } = progress;
    const answers = initial.answers;
    const [finishDialog, setFinishDialog] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const question = initial.questions[index];
    const original = bank.questions.find((q) => q.id === question.id)!;
    const total = initial.questions.length;
    const checkedIds = checkedQuestions(progress);
    const correct = isCorrect(question, selected);
    const ungraded = question.correctChoiceIds.length === 0;
    const practice = initial.settings.mode === "practice";
    const completed = practice ? checkedIds.length : initial.questions.filter((q) => answers[q.id]?.length).length;
    const last = index === total - 1;
    useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }, [index]);
    function select(id: string) {
        onProgress(selectSessionAnswer(progress, id));
    }
    function advance(nextAnswers: Attempt["answers"]) {
        const next = { ...progress, checkedIds, attempt: { ...initial, answers: nextAnswers }, selected: nextAnswers[question.id] };
        if (last) {
            onProgress(next);
            if (initial.questions.some((q) => !nextAnswers[q.id]?.length || (practice && !checkedIds.includes(q.id))))
                setFinishDialog(true);
            else
                onFinish(next.attempt);
        }
        else
            onProgress(navigateSession(next, index + 1));
    }
    function submit() {
        if (!selected.length || submitted)
            return;
        const next = { ...answers, [question.id]: [...selected] };
        if (practice)
            onProgress({ ...progress, checkedIds: [...checkedIds, question.id], attempt: { ...initial, answers: next }, submitted: true });
        else
            advance(next);
    }
    return <div className="page-content study-page">
    <div className="study-top"><button className="text-button" onClick={onExit}><Icon name="back" size={16}/>{t(" Leave session")}</button><span className="pill purple"><Icon name={practice ? "book" : "target"} size={14}/>{practice ? t("Practice") : t("Self-test")}</span></div>
    <div className="study-title"><h1>{bank.title}</h1><button className="text-button" onClick={() => setFinishDialog(true)}>{t("Finish early ")}<Icon name="flag" size={15}/></button></div>
    <div className="progress-heading"><span>{t("Question {number} of {total}", { number: index + 1, total })}</span><span>{t("{percent}% complete", { percent: Math.round(completed / total * 100) })}</span></div><div className="progress-track" role="progressbar" aria-label={t("Session progress")} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}><span style={{ width: `${completed / total * 100}%` }}/></div>
    <div className="study-grid"><div>
      <section className="question-card"><div className="question-kicker"><span className="eyebrow">{question.section || t("GENERAL")}</span><span className="pill">{question.type === "multiple_choice" ? t("Select all that apply") : t("Choose one answer")}</span></div><h2 ref={heading} tabIndex={-1}>{question.text}</h2>
        <div className="answer-options" role="group" aria-label={t("Answer choices")}>{question.choices.map((choice, choiceIndex) => {
            const chosen = selected.includes(choice.id);
            const right = question.correctChoiceIds.includes(choice.id);
            const state = submitted && !ungraded ? right ? "correct" : chosen ? "wrong" : "muted" : chosen ? "selected" : "";
            return <button key={choice.id} className={`answer-option ${state}`} aria-pressed={chosen} disabled={submitted} onClick={() => select(choice.id)}><span className="choice-letter">{initial.settings.shuffleAnswers && question.answerShuffleSafe ? String.fromCharCode(65 + choiceIndex) : choice.sourceLabel}</span><span className="choice-text">{choice.text}</span><span className={`answer-indicator ${question.type === "multiple_choice" ? "square" : ""}`}>{submitted && !ungraded ? (right ? <Icon name="check" size={17}/> : chosen ? <Icon name="close" size={17}/> : null) : chosen ? <Icon name="check" size={14}/> : null}</span></button>;
        })}</div>
        <nav className="question-footer" aria-label={t("Question navigation")}>
          <button className="button secondary" disabled={index === 0} onClick={() => onProgress(navigateSession(progress, index - 1))}><Icon name="back" size={16}/>{t("Previous")}</button>
          <div className="session-navigation">
            {!submitted ? <button className="button primary" disabled={!selected.length} onClick={submit}>{practice ? t("Check answer") : last ? t("Finish quiz") : t("Submit & next")}<Icon name={practice ? "check" : "arrow"} size={18}/></button> : last ? <button className="button primary" onClick={() => advance(answers)}>{t("See results")}<Icon name="arrow" size={18}/></button> : null}
            <button className="button secondary" disabled={last} onClick={() => onProgress(navigateSession(progress, index + 1))}>{t("Next")}<Icon name="arrow" size={16}/></button>
          </div>
        </nav>
      </section>

      {submitted && <section className={`feedback-panel ${ungraded ? "" : correct ? "feedback-correct" : "feedback-wrong"}`} aria-live="polite"><div className="feedback-heading"><span className={`feedback-symbol ${ungraded ? "neutral" : correct ? "green" : "red"}`}><Icon name={ungraded ? "flag" : correct ? "check" : "close"}/></span><div><h3>{ungraded ? t("Answer saved, ungraded.") : correct ? t("Correct") : t("Incorrect")}</h3>{ungraded && <p>{t("No answer key is available for this question.")}</p>}</div></div><AnswerReview question={original} selected={selected}/></section>}
    </div><aside className="study-aside"><section className="panel session-map"><span className="eyebrow">{t("YOUR SESSION")}</span><div className="question-dots" role="group" aria-label={t("Question navigation")}>{initial.questions.map((q, i) => {
            const answered = practice ? checkedIds.includes(q.id) : !!answers[q.id]?.length;
            const state = answered ? "answered" : "";
            return <button type="button" key={q.id} aria-label={t("Go to question {number}", { number: i + 1 })} aria-current={i === index ? "step" : undefined} onClick={() => onProgress(navigateSession(progress, i))} className={"question-map-button " + (i === index ? "current " : "") + state}>{i + 1}</button>;
        })}</div><p className="field-help">{t("{count} of {total} questions completed", { count: completed, total })}</p></section></aside></div>
    {finishDialog && <Modal title={t("Finish this session?")} description={t("Your current selection will be included. Any unanswered questions will appear in your review.")} onClose={() => setFinishDialog(false)}><div className="modal-content button-row end"><button className="button secondary" onClick={() => setFinishDialog(false)}>{t("Keep studying")}</button><button className="button primary" onClick={() => onFinish({ ...initial, answers: { ...answers, [question.id]: submitted ? answers[question.id] : [...selected] } })}>{t("See results ")}<Icon name="arrow" size={16}/></button></div></Modal>}
  </div>;
}
export function Results({ attempt, bank, onRetry, onBack }: {
    attempt: Attempt;
    bank: QuizBank;
    onRetry: (attempt: Attempt) => void;
    onBack: () => void;
}) {
    const { t } = useLanguage();
    const [filter, setFilter] = useState<"all" | "mistakes" | "correct">("all");
    const total = attempt.questions.length;
    const correct = attempt.questions.filter((q) => isCorrect(q, attempt.answers[q.id])).length;
    const ungraded = attempt.questions.filter((q) => !q.correctChoiceIds.length).length;
    const graded = total - ungraded;
    const skipped = attempt.questions.filter((q) => q.correctChoiceIds.length && !attempt.answers[q.id]?.length).length;
    const percent = graded ? Math.round(correct / graded * 100) : 0;
    const ordered = reviewOrder(attempt);
    const displayed = ordered.filter((q) => filter === "all" || (filter === "correct" ? isCorrect(q, attempt.answers[q.id]) : !isCorrect(q, attempt.answers[q.id])));
    function retry(mistakesOnly: boolean) {
        const ids = new Set(attempt.questions.filter((q) => !mistakesOnly || !isCorrect(q, attempt.answers[q.id])).map((q) => q.id));
        const questions = bank.questions.filter((q) => ids.has(q.id));
        onRetry(createAttempt({ ...bank, questions }, { ...attempt.settings, sections: [...new Set(questions.map((q) => q.section))], count: questions.length }));
    }
    return <div className="page-content results-page"><button className="text-button back-link" onClick={onBack}><Icon name="back" size={16}/>{t(" Back to project")}</button>
    <section className="results-hero"><div className="score-ring" style={{ "--score": `${percent}%` } as CSSProperties}><div><strong>{graded ? <>{percent}<span>%</span></> : "—"}</strong><small>{t("ACCURACY")}</small></div></div><div className="results-message"><span className="eyebrow">{t("SESSION COMPLETE")}</span><h1>{t("Results")}</h1><p>{t("You got ")}<strong>{correct}{t(" out of ")}{graded}</strong>{t(" questions correct.")}</p>{ungraded > 0 && <p>{t("{count} questions without an answer key were not graded.", { count: ungraded })}</p>}<span className="result-bank-title">{bank.title}</span></div><Icon name="spark" size={64}/></section>
    <div className="results-stats"><div><span className="stat-icon green"><Icon name="check"/></span><span><strong>{correct}</strong><small>{t("Correct")}</small></span></div><div><span className="stat-icon red"><Icon name="close"/></span><span><strong>{graded - correct - skipped}</strong><small>{t("Incorrect")}</small></span></div><div><span className="stat-icon neutral"><Icon name="arrow"/></span><span><strong>{skipped}</strong><small>{t("Unanswered")}</small></span></div>{ungraded > 0 && <div><span className="stat-icon neutral"><Icon name="flag"/></span><span><strong>{ungraded}</strong><small>{t("Ungraded")}</small></span></div>}<div className="result-actions"><button className="button secondary" onClick={() => retry(false)}><Icon name="refresh" size={16}/>{t(" Try again")}</button><button className="button primary" disabled={correct === total} onClick={() => retry(true)}>{t("Practice mistakes ")}<Icon name="arrow" size={16}/></button></div></div>
    <div className="review-heading"><div><h2>{t("Review answers")}</h2><p>{t("Mistakes and unanswered questions come first, followed by correct answers.")}</p></div></div>
    <div className="filter-tabs" aria-label={t("Filter results")}>{([["all", t("All questions ({count})", { count: total })], ["mistakes", t("To revisit ({count})", { count: total - correct })], ["correct", t("Correct ({count})", { count: correct })]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="review-list">{displayed.map((q) => {
            const right = isCorrect(q, attempt.answers[q.id]);
            const unknown = !q.correctChoiceIds.length;
            const unanswered = !attempt.answers[q.id]?.length;
            const original = bank.questions.find((item) => item.id === q.id)!;
            return <article className={`result-question ${unknown ? "result-ungraded" : right ? "result-correct" : "result-wrong"}`} key={q.id}><div className="result-question-heading"><span className={`pill ${unknown ? "neutral" : right ? "green" : unanswered ? "neutral" : "red"}`}><Icon name={unknown ? "flag" : right ? "check" : unanswered ? "arrow" : "close"} size={14}/>{unknown ? t("Ungraded") : right ? t("Correct") : unanswered ? t("Unanswered") : t("Incorrect")}</span><span>{t("Question ")}{q.id} · {q.section || t("General")}</span></div><h3>{q.text}</h3><AnswerReview question={original} selected={attempt.answers[q.id]}/></article>;
        })}</div>{!displayed.length && <div className="empty-search"><Icon name="check" size={30}/><h3>{filter === "mistakes" ? t("No questions to review.") : t("No questions in this group.")}</h3></div>}
  </div>;
}
