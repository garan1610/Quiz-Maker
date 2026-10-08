"use client";
import { useLanguage } from "./language";
import { useRef, useState } from "react";
import { parseBank, type QuizBank } from "@/lib/quiz";
import { importPrompt, importPromptVi } from "@/lib/import-prompt";
import { publicQuiz } from "@/lib/public-bank";
import { Icon, Modal } from "./ui";
export function Importer({ initialTab, onClose, onImport }: {
    initialTab: "upload" | "prompt";
    onClose: () => void;
    onImport: (bank: QuizBank) => void;
}) {
    const { language, t } = useLanguage();
    const prompt = language === "vi" ? importPromptVi : importPrompt;
    const [tab, setTab] = useState<"upload" | "paste" | "prompt">(initialTab);
    const [raw, setRaw] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const promptRef = useRef<HTMLTextAreaElement>(null);
    function openPrompt() {
        setErrors([]);
        setTab("prompt");
    }
    function importText(text: string) {
        const result = parseBank(text);
        if (result.bank)
            onImport(result.bank);
        else
            setErrors(result.errors);
    }
    async function importFile(file?: File) {
        if (!file || busy)
            return;
        if (input.current)
            input.current.value = "";
        setErrors([]);
        if (file.size > 5000000) {
            setErrors(["Choose a JSON file smaller than 5 MB."]);
            return;
        }
        if (!file.name.toLowerCase().endsWith(".json")) {
            setErrors(["Choose a .json file. For a PDF or Word document, use the AI prompt first."]);
            return;
        }
        setBusy(true);
        try {
            const text = await file.text();
            setRaw(text);
            importText(text);
        }
        catch {
            setErrors(["This file could not be read. Try selecting it again or paste its contents."]);
        }
        finally {
            setBusy(false);
        }
    }
    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setCopyFailed(false);
        }
        catch {
            setCopyFailed(true);
            promptRef.current?.focus();
            promptRef.current?.select();
        }
    }
    return <Modal title={t("Import a quiz")} onClose={onClose} wide>
    <div className="tab-bar" role="tablist" aria-label={t("Import method")}>
      {([["upload", "upload", t("Upload JSON")], ["paste", "file", t("Paste JSON")], ["prompt", "spark", t("Get AI prompt")]] as const).map(([value, icon, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} aria-controls="import-panel" onClick={() => { setTab(value); setErrors([]); }}><Icon name={icon} size={17}/>{label}</button>)}
    </div>
    <div id="import-panel" role="tabpanel" className="modal-content">
      {tab === "upload" && <>
        <input ref={input} className="visually-hidden" tabIndex={-1} type="file" accept=".json,application/json" aria-label={t("Choose JSON file")} onChange={(e) => void importFile(e.target.files?.[0])}/>
        <button type="button" disabled={busy} className={`dropzone ${dragging ? "dragging" : ""}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void importFile(e.dataTransfer.files[0]); }}>
          <span className="upload-art"><Icon name="upload" size={30}/></span><strong>{busy ? t("Reading your question bank\u2026") : t("Drop your quiz file here")}</strong><span>{t("or ")}<b>{t("browse files")}</b>{t(" to get started")}</span><small>{t("JSON files up to 5 MB \u00B7 Up to 2,000 questions")}</small>
        </button>
        <div className="import-tip"><Icon name="spark"/><div><strong>{t("Starting with a PDF or Word document?")}</strong><p>{t("Use our prompt in your AI chatbot to turn it into a quiz file.")}</p></div><button className="text-button" onClick={openPrompt}>{t("Get prompt ")}<Icon name="arrow" size={16}/></button></div>
      </>}
      {tab === "paste" && <><label className="field-label" htmlFor="json-input">{t("Your question bank")}</label><textarea id="json-input" className="code-input" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'{\n  "schemaVersion": 2,\n  "title": "My question bank",\n  "questions": [...]\n}'} spellCheck={false}/><p className="field-help">{t("Paste the complete JSON response from your chatbot. We\u2019ll check it before importing.")}</p><button className="button primary full-width" disabled={!raw.trim()} onClick={() => importText(raw)}>{t("Validate & import ")}<Icon name="arrow" size={17}/></button></>}
      {tab === "prompt" && <>
        <div className="mini-steps"><div><span>1</span>{t("Copy the prompt")}</div><Icon name="chevron" size={14}/><div><span>2</span>{t("Attach your document in AI")}</div><Icon name="chevron" size={14}/><div><span>3</span>{t("Import its JSON")}</div></div>
        <p className="prompt-intro">{t("Use your preferred chatbot. This prompt asks it to preserve your questions, answers, and explanations exactly.")}</p>
        <label className="visually-hidden" htmlFor="ai-prompt">{t("Question bank conversion prompt")}</label><textarea id="ai-prompt" ref={promptRef} className="code-input prompt-input" value={prompt} readOnly spellCheck={false}/>
        <div className="button-row"><button className="button primary" onClick={() => void copyPrompt()}><Icon name={copied ? "check" : "copy"} size={17}/>{copied ? t("Prompt copied") : t("Copy prompt")}</button><a className="button secondary" href={publicQuiz.jsonUrl} download><Icon name="download" size={17}/>{t(" Example JSON")}</a></div>
        {copyFailed && <p className="field-help" role="status">{t("Automatic copying isn\u2019t available. The prompt is selected; press Ctrl+C or copy it manually.")}</p>}
        <p className="field-help">{t("AI can make extraction mistakes. Review the answer key against your source before studying.")}</p>
      </>}
      {errors.length > 0 && <div className="error-box" role="alert"><strong>{t("Import errors")}</strong><ul>{errors.slice(0, 12).map((error, i) => <li key={i}>{t(error)}</li>)}</ul>{errors.length > 12 && <p>{t("And {count} more issues.", { count: errors.length - 12 })}</p>}<div className="import-error-actions"><button type="button" className="button secondary small" onClick={openPrompt}><Icon name="spark" size={15}/>{t("Get AI prompt")}<Icon name="arrow" size={15}/></button>{raw.trim() && <button type="button" className="text-button" onClick={() => setTab("paste")}>{t("Edit pasted JSON ")}<Icon name="arrow" size={15}/></button>}</div></div>}
    </div>
    
  </Modal>;
}
