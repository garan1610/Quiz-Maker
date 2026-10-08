"use client";
import { useEffect, useRef, useState } from "react";
import { loadPublicQuiz, publicQuiz } from "@/lib/public-bank";
import { emptyWorkspace, loadWorkspace, saveWorkspace, type Workspace } from "@/lib/storage";
import { LanguageProvider, useLanguage } from "./language";
import { needsReview, type Attempt, type Project, type QuizBank, type SavedSession } from "@/lib/quiz";
import { Importer } from "./importer";
import { ProjectView } from "./project-view";
import { Results, StudySession } from "./study-session";
import { Icon, Modal } from "./ui";
export default function QuizApp() { return <LanguageProvider><WorkspaceApp /></LanguageProvider>; }
function WorkspaceApp() {
    const { language, setLanguage, t } = useLanguage();
    const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
    const current = useRef(workspace);
    const writable = useRef(true);
    const [ready, setReady] = useState(false);
    const [storageError, setStorageError] = useState("");
    const [publicError, setPublicError] = useState("");
    const [loadingPublic, setLoadingPublic] = useState(false);
    const { projects, activeId, view } = workspace;
    useEffect(() => {
        let mounted = true;
        Promise.resolve().then(() => {
            if (!mounted)
                return;
            try {
                const saved = loadWorkspace();
                current.current = saved;
                setWorkspace(saved);
            }
            catch {
                writable.current = false;
                setStorageError("Saved data could not be loaded. Existing data has not been overwritten. You can still use the app temporarily and export your work.");
            }
            setReady(true);
        });
        return () => { mounted = false; };
    }, []);
    function update(change: (value: Workspace) => Workspace) {
        const next = change(current.current);
        current.current = next;
        setWorkspace(next);
        if (writable.current) {
            try {
                saveWorkspace(next);
                setStorageError("");
            }
            catch {
                setStorageError("Your latest changes could not be saved. Keep this tab open and export your project before leaving.");
            }
        }
    }
    const setProjects = (change: (value: Project[]) => Project[]) => update((value) => ({ ...value, projects: change(value.projects) }));
    const setActiveId = (id: string) => update((value) => ({ ...value, activeId: id }));
    const setView = (next: Workspace["view"]) => update((value) => ({ ...value, view: next }));
    const saveProgress = (progress: SavedSession) => setProjects((items) => items.map((p) => p.id === activeId ? { ...p, progress } : p));
    const [importTab, setImportTab] = useState<"upload" | "prompt" | null>(null);
    const [sessionId, setSessionId] = useState(0);
    const [search, setSearch] = useState("");
    const [leaveDialog, setLeaveDialog] = useState(false);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const project = projects.find((p) => p.id === activeId);
    const attempt = project?.progress?.attempt;
    const existingPublic = projects.find((p) => p.publicId === publicQuiz.id);
    function openProject(id: string) {
        update((value) => ({ ...value, activeId: id, view: "project" }));
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    function addProject(bank: QuizBank, publicId?: string) {
        const id = crypto.randomUUID();
        setProjects((current) => [...current, { id, bank, ...(publicId ? { publicId } : {}) }]);
        setActiveId(id);
        setView("project");
        setImportTab(null);
        setSearch("");
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    function start(next: Attempt) {
        saveProgress({ attempt: next, index: 0, selected: [], submitted: false, finished: false, checkedIds: [] });
        setSessionId((id) => id + 1);
        setView("study");
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    async function openPublic() {
        if (!ready || loadingPublic) return;
        if (existingPublic) {
            openProject(existingPublic.id);
            return;
        }
        setLoadingPublic(true);
        setPublicError("");
        try {
            addProject(await loadPublicQuiz(), publicQuiz.id);
        }
        catch (error) {
            setPublicError((error as Error).message);
        }
        finally {
            setLoadingPublic(false);
        }
    }
    function finish(result: Attempt) {
        saveProgress({ attempt: result, index: 0, selected: [], submitted: false, finished: true, checkedIds: [] });
        setView("results");
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    function goLibrary() {
        if (!ready)
            return;
        if (view === "study")
            setLeaveDialog(true);
        else {
            setView("library");
            window.scrollTo({ top: 0, behavior: "instant" });
        }
    }
    const visible = projects.filter((p) => p.bank.title.toLowerCase().includes(search.toLowerCase()));
    return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
    <aside className="sidebar project-sidebar">
      <button className="brand" onClick={goLibrary} aria-label={t("Recalled home")}><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">Recalled</span></button>
      <nav className="sidebar-home" aria-label={t("Main navigation")}><button className={`nav-item ${view === "library" ? "active" : ""}`} aria-current={view === "library" ? "page" : undefined} disabled={!ready} onClick={goLibrary}><Icon name="grid"/>{t("My projects")}<span className="nav-count">{projects.length}</span></button></nav>
      <div className="sidebar-collections">
        <section className="sidebar-section" aria-labelledby="saved-projects-heading">
          <h2 id="saved-projects-heading">{t("Saved projects")}</h2>
          <nav aria-label={t("Saved projects")}>{projects.map((p) => <button key={p.id} className={`sidebar-project ${view !== "library" && activeId === p.id ? "active" : ""}`} aria-current={view !== "library" && activeId === p.id ? "page" : undefined} title={p.bank.title} onClick={() => openProject(p.id)}><Icon name="book" size={16}/><span className="sidebar-project-title">{p.bank.title}</span><span className="sidebar-question-count">{p.bank.questions.length}</span></button>)}</nav>
          {ready && !projects.length && <p className="sidebar-empty">{t("No saved projects")}</p>}
        </section>
        <section className="sidebar-section" aria-labelledby="public-banks-heading">
          <h2 id="public-banks-heading">{t("Public question banks")}</h2>
          <nav aria-label={t("Public question banks")}><button className={`sidebar-project ${view !== "library" && project?.publicId === publicQuiz.id ? "active" : ""}`} disabled={!ready || loadingPublic} onClick={() => void openPublic()} title={publicQuiz.title}><Icon name="book" size={16}/><span className="sidebar-project-title">{publicQuiz.title}</span><span className="sidebar-question-count">{publicQuiz.questionCount}</span></button></nav>
        </section>
      </div>
      <div className="sidebar-prompt"><button className="nav-item" disabled={!ready} onClick={() => setImportTab("prompt")}><Icon name="spark" size={18}/>{t("AI conversion prompt")}<Icon name="chevron" size={14}/></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><Icon name="grid" size={17}/><button onClick={goLibrary}>{t("My projects")}</button>{view !== "library" && <><Icon name="chevron" size={14}/><span>{view === "project" ? t("Study setup") : view === "study" ? t("Study session") : t("Your results")}</span></>}</div><div className="language-switch" role="group" aria-label="Language / Ngôn ngữ"><button lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button><span aria-hidden="true">–</span><button lang="vi" aria-pressed={language === "vi"} onClick={() => setLanguage("vi")}>VI</button></div></header>
      <main id="main-content">
        {publicError && <div className="storage-warning error-box" role="alert">{t(publicError)}</div>}
        {storageError && <div className="storage-warning notice amber" role="alert"><Icon name="flag"/><p>{t(storageError)}</p></div>}
        {!ready && <div className="page-content" role="status">{t("Loading your projects…")}</div>}
        {ready && view === "library" && <div className="page-content library-page">
          <div className="welcome-heading"><div><h1>Recalled</h1><p>{t("Automatically generate quizzes from question banks")}</p></div><div className="hero-art" aria-hidden="true" lang="en" translate="no"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✧</span><div className="art-card art-card-back"><span /><span /><span /></div><div className="art-card art-card-front"><span className="art-card-label">A MOMENT OF CLARITY</span><div className="art-question">Oh, now<br />I get it.</div><div className="art-answer"><span>✓</span> That’s the one.</div></div><div className="art-check"><Icon name="check" size={30}/></div></div></div>
          <div className="library-actions"><button className="button primary" onClick={() => setImportTab("upload")}><Icon name="plus" size={18}/>{t(" Import a quiz")}</button><button className="button secondary" onClick={() => setImportTab("prompt")}><Icon name="spark" size={17}/>{t(" Get AI prompt")}</button></div>
          <section className="how-it-works"><div className="how-title"><h2>{t("How to import")}</h2></div><div className="how-step"><span className="how-icon lilac"><Icon name="copy"/></span><h3><small>01</small>{t(" Copy the prompt")}</h3><p>{t("Take our prompt and your document to your favorite AI chatbot.")}</p></div><div className="how-step"><span className="how-icon peach"><Icon name="upload"/></span><h3><small>02</small>{t(" Import JSON")}</h3><p>{t("Import its JSON file. Check the questions and answer key.")}</p></div><div className="how-step"><span className="how-icon mint"><Icon name="play"/></span><h3><small>03</small>{t(" Study")}</h3><p>{t("Shuffle, practice, and learn from the questions you missed.")}</p></div></section>
          <section className="projects-section"><div className="projects-heading"><div><h2>{t("My projects ")}<span>{projects.length}</span></h2></div>{projects.length > 0 && <label className="search-field"><Icon name="search" size={17}/><input aria-label={t("Search projects")} placeholder={t("Find a project\u2026")} value={search} onChange={(e) => setSearch(e.target.value)}/></label>}</div>
            <div className="project-grid">{visible.map((p, index) => <article key={p.id} className="project-card"><button className="project-card-main" onClick={() => openProject(p.id)}><div className="project-card-top"><span className={`project-icon tone-${index % 3}`}><Icon name="book" size={24}/></span><span className="pill">{p.bank.questions.length}{t(" questions")}</span></div><h3>{p.bank.title}</h3><p>{p.publicId === publicQuiz.id ? publicQuiz.sourceName : t("Imported question bank")}</p><div className="project-card-bottom"><span>{new Set(p.bank.questions.map((q) => q.section)).size}{t(" sections")}</span>{p.bank.questions.some(needsReview) ? <span className="flag-count">{t("Needs review")}</span> : <span className="card-open">{t("Study ")}<Icon name="arrow" size={17}/></span>}</div></button><button className="project-delete icon-button" aria-label={t("Delete {title}", { title: p.bank.title })} onClick={() => setDeleting(p)}><Icon name="trash" size={16}/></button></article>)}
              {!search && <button className="new-project-card" onClick={() => setImportTab("upload")}><span className="new-project-icon"><Icon name="plus" size={26}/></span><h3>{projects.length ? t("Add another quiz") : t("Import a quiz")}</h3><span className="text-button">{t("Import JSON ")}<Icon name="arrow" size={16}/></span></button>}

            </div>{search && !visible.length && <div className="empty-search"><Icon name="search" size={25}/><h3>{t("No projects found")}</h3><p>{t("Try another title.")}</p></div>}
          </section>
          <section className="public-section"><div className="projects-heading"><div><h2>{t("Public quizz")}</h2></div></div>
            <article className="sample-card public-card"><div className="sample-card-top"><span className="pill">{t("PUBLIC QUESTION BANK")}</span><Icon name="book" size={28}/></div><h3>{publicQuiz.title}</h3><p>{t("Practice chapters 1\u20134 with the supplied questions, answers, and explanations.")}</p><div className="public-source"><Icon name="file" size={16}/><a href={encodeURI(publicQuiz.sourceUrl)} download>{t("Source Word document")}: {publicQuiz.sourceName}</a></div><div className="sample-card-footer"><span>{publicQuiz.questionCount} {t("questions")} · 4 {t("sections")}</span><div className="button-row"><a className="button secondary small" href={publicQuiz.jsonUrl} download><Icon name="download" size={15}/>{t("Download JSON")}</a><button className="button primary" disabled={loadingPublic} onClick={() => void openPublic()}>{t(loadingPublic ? "Loading quiz…" : existingPublic ? "Open my copy" : "Open public quiz")}<Icon name="arrow" size={16}/></button></div></div></article>
          </section>
        </div>}
        {view === "project" && project && <ProjectView key={project.id} bank={project.bank} onBack={goLibrary} onUpdate={(bank) => setProjects((current) => current.map((p) => p.id === project.id ? { ...p, bank, progress: undefined } : p))} onStart={start} savedSettings={project.settings} onSettingsChange={(settings) => setProjects((items) => items.map((p) => p.id === project.id ? { ...p, settings } : p))} progress={project.progress} onResume={() => setView(project.progress?.finished ? "results" : "study")} sourceUrl={project.publicId === publicQuiz.id ? publicQuiz.sourceUrl : undefined}/>}
        {view === "study" && project && attempt && <StudySession key={sessionId} progress={project.progress!} onProgress={saveProgress} bank={project.bank} onExit={() => setLeaveDialog(true)} onFinish={finish}/>} 
        {view === "results" && project && attempt && <Results key={sessionId} attempt={attempt} bank={project.bank} onBack={() => { setView("project"); window.scrollTo({ top: 0, behavior: "instant" }); }} onRetry={start}/>}
      </main>
    </div>
    {importTab && <Importer initialTab={importTab} onClose={() => setImportTab(null)} onImport={addProject}/>}
    {leaveDialog && <Modal title={t("Leave this session?")} description={t("Your progress is saved. You can resume this session from your project.")} onClose={() => setLeaveDialog(false)}><div className="modal-content button-row end"><button className="button secondary" onClick={() => setLeaveDialog(false)}>{t("Keep studying")}</button><button className="button primary" onClick={() => { setLeaveDialog(false); setView("project"); }}>{t("Save & leave")}</button></div></Modal>}
    {deleting && <Modal title={t("Remove this project?")} description={t("“{title}” will be removed from this browser. Your original JSON file won’t be changed.", { title: deleting.bank.title })} onClose={() => setDeleting(null)}><div className="modal-content button-row end"><button className="button secondary" onClick={() => setDeleting(null)}>{t("Cancel")}</button><button className="button danger" onClick={() => { setProjects((current) => current.filter((p) => p.id !== deleting.id)); setDeleting(null); }}>{t("Remove project")}</button></div></Modal>}
  </div>;
}
