"use client";
import { useState } from "react";
import { compactBank, parseBank, type Question, type QuizBank } from "@/lib/quiz";
import { useLanguage } from "./language";
import { QuestionEditor } from "./question-editor";
import { AnswerReview, Icon, Modal } from "./ui";

export function ProjectCustomizer({ bank, hasProgress, onSave, onClose }: {
  bank: QuizBank;
  hasProgress: boolean;
  onSave: (bank: QuizBank, questionsChanged: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(bank);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const questionsChanged = draft.questions !== bank.questions;
  const displayed = draft.questions.filter((question) => `${question.id} ${question.section} ${question.text}`.toLowerCase().includes(query.trim().toLowerCase()));

  function save() {
    const updated = { ...draft, title: draft.title.trim() };
    // Rebuild question and choice IDs after deletions, just as imports and reloads do.
    const parsed = parseBank(JSON.stringify(compactBank(updated)));
    if (!parsed.bank) {
      setErrors(parsed.errors);
      return;
    }
    onSave(questionsChanged ? parsed.bank : updated, questionsChanged);
  }

  return <>
    <Modal title={t("Customize project")} onClose={onClose} wide>
      <form onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="modal-content project-customizer">
          <label className="field-label">{t("Project title")}<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label>
          <div className="customizer-heading"><h3>{t("Questions")} <span className="count-badge">{draft.questions.length}</span></h3><label className="search-field"><Icon name="search" size={16}/><input aria-label={t("Search questions")} placeholder={t("Search questions or sections…")} value={query} onChange={(event) => setQuery(event.target.value)}/></label></div>
          <div className="customizer-questions">
            {displayed.map((question) => <article className="customizer-question" key={question.id}>
              <div className="customizer-question-heading">
                <span className="question-number">{question.id}</span>
                <div className="customizer-question-text"><small>{question.section || t("General")}</small><p>{question.text}</p></div>
                <div className="customizer-question-actions">
                  <button type="button" className="icon-button" aria-label={t("Edit question {number}", { number: question.id })} title={t("Edit question")} onClick={() => setEditing(question)}><Icon name="edit" size={17}/></button>
                  <button type="button" className="icon-button remove-choice" aria-label={t("Delete question {number}", { number: question.id })} title={t(draft.questions.length === 1 ? "Keep at least one question." : "Delete question")} disabled={draft.questions.length === 1} onClick={() => setDeleting(question.id)}><Icon name="trash" size={17}/></button>
                </div>
              </div>
              {deleting === question.id && <div className="customizer-delete-confirm" role="group" aria-label={t("Delete question?")}><span>{t("Delete question?")}</span><button type="button" className="button secondary small" onClick={() => setDeleting(null)}>{t("Cancel")}</button><button type="button" className="button danger small" onClick={() => {
                if (draft.questions.length > 1) setDraft({ ...draft, questions: draft.questions.filter((item) => item.id !== question.id) });
                setDeleting(null);
              }}>{t("Delete question")}</button></div>}
              <details className="customizer-answer-preview"><summary>{t("View answers")}</summary><AnswerReview question={question}/></details>
            </article>)}
            {!displayed.length && <p className="empty-search">{t("No matching questions")}</p>}
          </div>
          {errors.length > 0 && <div className="error-box" role="alert"><ul>{errors.map((error, index) => <li key={index}>{t(error)}</li>)}</ul></div>}
        </div>
        <div className="modal-footer customizer-footer"><p>{t(questionsChanged && hasProgress ? "Saving question changes resets the saved session." : "Changes apply when you save the project.")}</p><div className="button-row"><button type="button" className="button secondary" onClick={onClose}>{t("Cancel")}</button><button type="submit" className="button primary" disabled={!draft.title.trim()}><Icon name="check" size={17}/>{t("Save project")}</button></div></div>
      </form>
    </Modal>
    {editing && <QuestionEditor question={editing} onClose={() => setEditing(null)} onSave={(question) => {
      setDraft({ ...draft, questions: draft.questions.map((item) => item.id === question.id ? question : item) });
      setEditing(null);
    }}/>}
  </>;
}
