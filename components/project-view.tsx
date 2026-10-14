"use client";
import { useLanguage } from "./language";
import { useState } from "react";
import { createAttempt, compactBank, needsReview, type Attempt, type Question, type QuizBank, type Settings, type SavedSession } from "@/lib/quiz";
import { AnswerReview, downloadJson, Icon } from "./ui";
import { QuestionEditor } from "./question-editor";
export function ProjectView({ bank, onUpdate, onCustomize, onStart, onBack, savedSettings, onSettingsChange, progress, onResume, sourceUrl }: {
    bank: QuizBank;
    onUpdate: (bank: QuizBank) => void;
    onCustomize: () => void;
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
    const settings: Settings = savedSettings ?? { sections, count: bank.questions.length, shuffleQuestions: true, shuffleAnswers: false, mode: "practice" };
    function setSettings(next: Settings) { onSettingsChange(next); }
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
    <div className="page-heading"><div><span className="eyebrow">{t("YOUR QUESTION BANK")}</span><div className="project-title-row"><h1>{bank.title}</h1><button type="button" className="icon-button customize-project" onClick={onCustomize} aria-label={t("Customize project")} title={t("Customize project")}><Icon name="edit" size={19}/></button></div><p className="project-subline"><Icon name="file" size={16}/>{t("Imported question bank")}<span>·</span>{bank.questions.length}{t(" questions")}<span>·</span>{sections.length}{t(" sections")}</p></div><button className="button secondary" onClick={() => downloadJson(compactBank(bank), bank.title)}><Icon name="download" size={17}/>{t(" Export JSON")}</button></div>
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
                const questions = bank.questions.map((q) => q.id === question.id ? question : q);
                onUpdate({ ...bank, questions });
                const nextSections = [...new Set(questions.map((q) => q.section))];
                const selectedSections = settings.sections.filter((section) => nextSections.includes(section));
                if (!sections.includes(question.section)) selectedSections.push(question.section);
                setSettings({ ...settings, sections: selectedSections });
                setEditing(null);
            }}/>} 
  </div>;
}
