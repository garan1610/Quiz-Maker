"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import { createAttempt, compactBank, needsReview, parseBank, type Attempt, type Question, type QuizBank, type Settings, type SavedSession } from "@/lib/quiz";
import { AnswerReview, downloadJson, Icon, Modal } from "./ui";
function QuestionEditor({ question, onSave, onClose }: {
    question: Question;
    onSave: (question: Question) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const [draft, setDraft] = useState<Question>(() => structuredClone(question));
    const [resolved, setResolved] = useState(false);
    const [error, setError] = useState("");
    function save() {
        const result = parseBank(JSON.stringify(compactBank({ title: "Review", questions: [{ ...draft, reviewIssues: resolved ? [] : draft.reviewIssues }] })));
        if (!result.bank) {
            setError(result.errors.join(" "));
            return;
        }
        if (resolved && !draft.correctChoiceIds.length) {
            setError("Choose the correct answer before marking this question as reviewed.");
            return;
        }
        const validated = result.bank.questions[0];
        onSave({ ...draft, type: validated.type, answerShuffleSafe: validated.answerShuffleSafe, reviewIssues: validated.reviewIssues });
    }
    return <Modal title={t("Edit question {number}", { number: question.id })} description={t("Check your changes against the original document.")} onClose={onClose} wide>
    <form className="modal-content editor-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label className="field-label">{t("Question")}<textarea rows={4} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}/></label>
      <div className="form-grid"><label className="field-label">{t("Section")}<input value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })}/></label><label className="field-label">{t("Answer type")}<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Question["type"], correctChoiceIds: e.target.value === "single_choice" ? draft.correctChoiceIds.slice(0, 1) : draft.correctChoiceIds })}><option value="single_choice">{t("Single choice")}</option><option value="multiple_choice">{t("Multiple choices")}</option></select></label></div>
      <fieldset className="editor-choices"><legend>{t("Choices ")}<span>{t(draft.type === "multiple_choice" ? "Select the correct answers" : "Select the correct answer")}</span></legend>{draft.choices.map((choice, index) => <div className="editor-choice" key={choice.id}><input type={draft.type === "single_choice" ? "radio" : "checkbox"} name="correct-choice" aria-label={t("Mark {label} as correct", { label: choice.sourceLabel })} checked={draft.correctChoiceIds.includes(choice.id)} onChange={() => setDraft({ ...draft, correctChoiceIds: draft.type === "single_choice" ? [choice.id] : draft.correctChoiceIds.includes(choice.id) ? draft.correctChoiceIds.filter((id) => id !== choice.id) : [...draft.correctChoiceIds, choice.id] })}/><span className="choice-letter">{choice.sourceLabel}</span><textarea aria-label={t("Choice {label} text", { label: choice.sourceLabel })} rows={2} value={choice.text} onChange={(e) => setDraft({ ...draft, choices: draft.choices.map((c, i) => i === index ? { ...c, text: e.target.value } : c) })}/></div>)}</fieldset>
      <label className="field-label">{t("Explanation")}<textarea rows={5} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}/></label>
      <label className="field-label">{t("Source page")}<input type="number" min={1} step={1} value={draft.source_page ?? ""} onChange={(e) => setDraft({ ...draft, source_page: e.target.value === "" ? undefined : Number(e.target.value) })}/></label>
      <label className="check-label"><input type="checkbox" checked={draft.answerShuffleSafe} onChange={(e) => setDraft({ ...draft, answerShuffleSafe: e.target.checked })}/>{t("These choices can be shuffled without changing their meaning.")}</label>
      <p className="field-help">{t("Keep this off for \u201Call of the above\u201D, references to other choices, or any order-dependent wording.")}</p>
      {needsReview(question) && <div className="notice amber"><Icon name="flag"/><div><strong>{t("Flagged during import")}</strong><ul>{question.reviewIssues.map((issue, index) => <li key={index}>{t(issue)}</li>)}</ul><label className="check-label"><input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)}/>{t("I checked this against the source and resolved these issues.")}</label></div></div>}
      {error && <div className="error-box" role="alert">{t(error)}</div>}
      <div className="button-row end"><button type="button" className="button secondary" onClick={onClose}>{t("Cancel")}</button><button className="button primary" type="submit">{t("Save question ")}<Icon name="check" size={17}/></button></div>
    </form>
  </Modal>;
}
export function ProjectView({ bank, onUpdate, onStart, onBack, savedSettings, onSettingsChange, progress, onResume, sourceUrl }: {
    bank: QuizBank;
    onUpdate: (bank: QuizBank) => void;
    onStart: (attempt: Attempt) => void;
    onBack: () => void;
    savedSettings?: Settings;
    onSettingsChange: (settings: Settings) => void;
    progress?: SavedSession;
    onResume: () => void;
    sourceUrl?: string;
}) {
    const { t } = useLanguage();
    const sections = [...new Set(bank.questions.map((q) => q.section))];
    const [settings, updateSettings] = useState<Settings>(savedSettings ?? { sections, count: bank.questions.length, shuffleQuestions: true, shuffleAnswers: false, mode: "practice" });
    function setSettings(next: Settings) { updateSettings(next); onSettingsChange(next); }
    const [tab, setTab] = useState<"setup" | "questions">("setup");
    const [query, setQuery] = useState("");
    const [onlyFlagged, setOnlyFlagged] = useState(false);
    const [editing, setEditing] = useState<Question | null>(null);
    const [error, setError] = useState("");
    const eligible = bank.questions.filter((q) => settings.sections.includes(q.section));
    const count = Math.min(settings.count, eligible.length);
    const flagged = bank.questions.filter(needsReview).length;
    const blocked = eligible.some(needsReview);
    const displayed = bank.questions.filter((q) => (!onlyFlagged || needsReview(q)) && `${q.text} ${q.section} ${q.id}`.toLowerCase().includes(query.toLowerCase()));
    function acceptReviewed(ids: string[]) {
        onUpdate({ ...bank, questions: bank.questions.map((q) => ids.includes(q.id) && q.correctChoiceIds.length ? { ...q, reviewIssues: [] } : q) });
    }
    function start(skipReview = false) {
        try {
            onStart(createAttempt(bank, { ...settings, count, skipReview }));
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    return <div className="page-content project-page">
    <button className="text-button back-link" onClick={onBack}><Icon name="back" size={16}/>{t(" All projects")}</button>
    <div className="page-heading"><div><span className="eyebrow">{t("YOUR QUESTION BANK")}</span><h1>{bank.title}</h1><p className="project-subline"><Icon name="file" size={16}/>{t("Imported question bank")}<span>·</span>{bank.questions.length}{t(" questions")}<span>·</span>{sections.length}{t(" sections")}</p></div><button className="button secondary" onClick={() => downloadJson(compactBank(bank), bank.title)}><Icon name="download" size={17}/>{t(" Export JSON")}</button></div>
    <p className="project-backup-note"><Icon name="download" size={14}/>{t("This quiz may be lost if browser data is cleared. Export JSON to keep a copy.")}</p>
    {sourceUrl && <a className="source-download text-button" href={encodeURI(sourceUrl)} download><Icon name="download" size={16}/>{t("Source Word document")}</a>}
    {progress && <div className="resume-banner notice"><Icon name="clock"/><div><strong>{t("Your previous session is saved.")}</strong><p>{t("Starting a new session replaces the saved attempt for this project.")}</p></div><button className="button primary small" onClick={onResume}>{progress.finished ? t("Review saved results") : t("Resume session")}<Icon name="arrow" size={16}/></button></div>}
    <div className="tab-bar project-tabs"><button aria-pressed={tab === "setup"} className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}><Icon name="play" size={16}/>{t(" Study setup")}</button><button aria-pressed={tab === "questions"} className={tab === "questions" ? "active" : ""} onClick={() => setTab("questions")}><Icon name="book" size={16}/>{t(" Question bank ")}<span className="count-badge">{bank.questions.length}</span>{flagged > 0 && <span className="flag-count">{t("{count} to review", { count: flagged })}</span>}</button></div>
    {flagged > 0 && <div className="notice amber"><Icon name="flag"/><div><strong>{t("{count} questions need your review", { count: flagged })}</strong><p>{t("Check the flagged answers against your source before studying those sections.")}</p></div><button className="text-button" onClick={() => { setTab("questions"); setOnlyFlagged(true); }}>{t("Review now ")}<Icon name="arrow" size={16}/></button></div>}
    {flagged > 0 && <div className="review-actions"><button className="button secondary" disabled={!bank.questions.some((q) => needsReview(q) && q.correctChoiceIds.length)} onClick={() => acceptReviewed(bank.questions.filter(needsReview).map((q) => q.id))}>{t("Accept all questions with answers")}</button><button className="button primary" disabled={!count} onClick={() => start(true)}>{t("Skip review & study")}</button><p className="field-help">{t("Skipping review keeps the warnings. Questions without an answer key are ungraded.")}</p></div>}
    {tab === "setup" ? <div className="setup-grid">
      <div className="setup-main">
        <section className="panel"><div className="section-heading"><span className="step-dot">1</span><div><h2>{t("Question selection")}</h2><p>{t("Choose your sections and session length.")}</p></div></div>
          <div className="section-select-heading"><span className="field-label">{t("Sections")}</span><button className="text-button" onClick={() => setSettings({ ...settings, sections: settings.sections.length === sections.length ? [] : sections })}>{settings.sections.length === sections.length ? t("Deselect all") : t("Select all")}</button></div>
          <div className="section-list">{sections.map((section) => <label key={section} className="section-option"><input type="checkbox" checked={settings.sections.includes(section)} onChange={() => setSettings({ ...settings, sections: settings.sections.includes(section) ? settings.sections.filter((s) => s !== section) : [...settings.sections, section] })}/><span>{section || t("General")}</span><small>{bank.questions.filter((q) => q.section === section).length}</small></label>)}</div>
          <div className="count-setting"><label className="field-label" htmlFor="question-count">{t("Number of questions")}<small>{t("{count} available in your selection", { count: eligible.length })}</small></label><input id="question-count" type="number" min={1} max={Math.max(1, eligible.length)} value={count || ""} disabled={!eligible.length} onChange={(e) => { const value = Number(e.target.value); setSettings({ ...settings, count: Math.max(1, Math.min(eligible.length, Number.isFinite(value) ? Math.floor(value) : 1)) }); }}/><button className="text-button" disabled={!eligible.length} onClick={() => setSettings({ ...settings, count: eligible.length })}>{t("Use all")}</button></div>
        </section>
        <section className="panel"><div className="section-heading"><span className="step-dot">2</span><div><h2>{t("Session settings")}</h2></div></div>
          <label className="toggle-row"><span className="setting-icon"><Icon name="shuffle"/></span><span><strong>{t("Shuffle questions")}</strong></span><input className="switch" type="checkbox" checked={settings.shuffleQuestions} onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}/></label>
          <label className="toggle-row"><span className="setting-icon"><Icon name="layers"/></span><span><strong>{t("Shuffle answers")}</strong></span><input className="switch" type="checkbox" checked={settings.shuffleAnswers} onChange={(e) => setSettings({ ...settings, shuffleAnswers: e.target.checked })}/></label>
          
        </section>
      </div>
      <aside className="setup-aside panel"><h2>{t("Study mode")}</h2><div className="mode-options">{([["practice", "book", t("Practice"), t("See the answer and explanation after each question.")], ["exam", "target", t("Self-test"), t("Save all feedback for the end of the session.")]] as const).map(([mode, icon, title, description]) => <label className={`mode-option ${settings.mode === mode ? "selected" : ""}`} key={mode}><input type="radio" name="study-mode" value={mode} checked={settings.mode === mode} onChange={() => setSettings({ ...settings, mode })}/><Icon name={icon}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div>
        <div className="session-tally"><span>{t("Questions")}</span><strong>{count}</strong></div><div className="session-tally"><span>{t("Selected sections")}</span><strong>{settings.sections.filter((s) => sections.includes(s)).length}</strong></div>
        <button className="button primary full-width start-button" disabled={!count || blocked} onClick={() => start()}>{t("Start studying ")}<Icon name="arrow" size={18}/></button>
        {blocked && <p className="field-help">{t("Resolve flagged questions in your selected sections to start.")}</p>}
        {error && <p className="error-box" role="alert">{t(error)}</p>}
      </aside>
    </div> : <section className="bank-section"><div className="bank-toolbar"><label className="search-field"><Icon name="search" size={18}/><input placeholder={t("Search questions or sections\u2026")} aria-label={t("Search questions")} value={query} onChange={(e) => setQuery(e.target.value)}/></label><label className="check-label"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)}/>{t("Needs review only")}</label></div>
      <p className="field-help">{t("This is your answer key. Check it against the source; you can edit any question and export your corrections.")}</p>
      <div className="bank-questions">{displayed.map((q) => <details className="bank-question" key={q.id}><summary><span className="question-number">{q.id}</span><span><small>{q.section || t("General")}</small><strong>{q.text}</strong></span>{needsReview(q) && <span className="flag-count"><Icon name="flag" size={13}/>{t(" Review")}</span>}<Icon name="chevron" size={17}/></summary><div className="bank-question-body"><div className="question-actions"><span className="pill">{q.type === "multiple_choice" ? t("Multiple answers") : t("Single answer")}</span>{needsReview(q) && q.correctChoiceIds.length > 0 && <button className="button secondary small" onClick={() => acceptReviewed([q.id])}><Icon name="check" size={15}/>{t("Accept question")}</button>}<button className="button secondary small" onClick={() => setEditing(q)}><Icon name="edit" size={15}/>{t(" Edit question")}</button></div>{q.reviewIssues.length > 0 && <div className="notice amber"><ul>{q.reviewIssues.map((issue, i) => <li key={i}>{t(issue)}</li>)}</ul></div>}<AnswerReview question={q}/></div></details>)}</div>
      {!displayed.length && <div className="empty-search"><Icon name="search" size={26}/><h3>{t("No matching questions")}</h3><p>{t("Try a different search or turn off the review filter.")}</p></div>}
    </section>}
    {editing && <QuestionEditor question={editing} onClose={() => setEditing(null)} onSave={(question) => {
                onUpdate({ ...bank, questions: bank.questions.map((q) => q.id === question.id ? question : q) });
                if (!sections.includes(question.section))
                    setSettings({ ...settings, sections: [...settings.sections, question.section] });
                setEditing(null);
            }}/>} 
  </div>;
}
