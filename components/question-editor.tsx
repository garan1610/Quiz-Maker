"use client";
import { useState } from "react";
import { compactBank, needsReview, parseBank, type Question } from "@/lib/quiz";
import { useLanguage } from "./language";
import { Icon, Modal } from "./ui";
export function QuestionEditor({ question, onSave, onClose }: {
    question: Question;
    onSave: (question: Question) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const [draft, setDraft] = useState<Question>(() => structuredClone(question));
    const [resolved, setResolved] = useState(false);
    const [error, setError] = useState("");
    const [choicesChanged, setChoicesChanged] = useState(false);
    function addChoice() {
        if (draft.choices.length >= 26) return;
        const label = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))
            .find((value) => !draft.choices.some((choice) => choice.sourceLabel === value))!;
        setDraft({ ...draft, choices: [...draft.choices, { id: crypto.randomUUID(), sourceLabel: label, text: "" }].sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel)) });
        setChoicesChanged(true);
        setError("");
    }
    function removeChoice(id: string) {
        if (draft.choices.length <= 2) return;
        setDraft({ ...draft,
            choices: draft.choices.filter((choice) => choice.id !== id).map((choice, index) => ({ ...choice, sourceLabel: String.fromCharCode(65 + index) })),
            correctChoiceIds: draft.correctChoiceIds.filter((value) => value !== id),
        });
        setChoicesChanged(true);
        setError("");
    }
    function save() {
        if (question.correctChoiceIds.length && !draft.correctChoiceIds.length) {
            setError("Choose at least one correct answer before saving.");
            return;
        }
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
        // Match the IDs reconstructed from compact JSON so future sessions survive reloads.
        const choices = validated.choices.map((choice, index) => ({ ...choice, id: `${question.id}_${index + 1}` }));
        onSave({ ...validated, id: question.id, choices,
            correctChoiceIds: choices.filter((choice) => validated.choices.some((original) => original.sourceLabel === choice.sourceLabel && validated.correctChoiceIds.includes(original.id))).map((choice) => choice.id),
        });
    }
    return <Modal title={t("Edit question {number}", { number: question.id })} description={t("Check your changes against the original document.")} onClose={onClose} wide>
    <form className="modal-content editor-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label className="field-label">{t("Question")}<textarea rows={4} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}/></label>
      <div className="form-grid"><label className="field-label">{t("Section")}<input value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })}/></label><label className="field-label">{t("Answer type")}<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Question["type"], correctChoiceIds: e.target.value === "single_choice" ? draft.correctChoiceIds.slice(0, 1) : draft.correctChoiceIds })}><option value="single_choice">{t("Single choice")}</option><option value="multiple_choice">{t("Multiple choices")}</option></select></label></div>
      <fieldset className="editor-choices"><legend>{t("Choices ")}<span>{t(draft.type === "multiple_choice" ? "Select the correct answers" : "Select the correct answer")}</span></legend>{draft.choices.map((choice, index) => <div className="editor-choice" key={choice.id}><input type={draft.type === "single_choice" ? "radio" : "checkbox"} name="correct-choice" aria-label={t("Mark {label} as correct", { label: choice.sourceLabel })} checked={draft.correctChoiceIds.includes(choice.id)} onChange={() => setDraft({ ...draft, correctChoiceIds: draft.type === "single_choice" ? [choice.id] : draft.correctChoiceIds.includes(choice.id) ? draft.correctChoiceIds.filter((id) => id !== choice.id) : [...draft.correctChoiceIds, choice.id] })}/><span className="choice-letter">{choice.sourceLabel}</span><textarea aria-label={t("Choice {label} text", { label: choice.sourceLabel })} rows={2} value={choice.text} onChange={(e) => setDraft({ ...draft, choices: draft.choices.map((c, i) => i === index ? { ...c, text: e.target.value } : c) })}/><button type="button" className="icon-button remove-choice" disabled={draft.choices.length <= 2} aria-label={t("Remove answer {label}", { label: choice.sourceLabel })} title={t(draft.choices.length <= 2 ? "Keep at least two answers." : "Remove answer {label}", { label: choice.sourceLabel })} onClick={() => removeChoice(choice.id)}><Icon name="trash" size={17}/></button></div>)}<div className="editor-choice-actions"><button type="button" className="button secondary small" disabled={draft.choices.length >= 26} onClick={addChoice}><Icon name="plus" size={16}/>{t("Add answer")}</button><span>{t("{count} / 26 answers", { count: draft.choices.length })}</span></div></fieldset>
      {choicesChanged && <p className="field-help choice-edit-note">{t("Answer letters may have changed. Check the correct answers and any letter references in the question or explanation.")}</p>}
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
