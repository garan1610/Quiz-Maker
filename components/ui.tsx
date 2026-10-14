"use client";
import { useLanguage } from "./language";
import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Question } from "@/lib/quiz";
export type IconName = "grid" | "plus" | "arrow" | "back" | "upload" | "file" | "spark" | "check" | "close" | "shuffle" | "book" | "copy" | "download" | "clock" | "play" | "edit" | "trash" | "search" | "chevron" | "flag" | "refresh" | "shield" | "target" | "layers";
const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, back: <path d="M20 12H4m6-6-6 6 6 6"/>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/></>,
    check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    shuffle: <><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3.5-2 5-5m2-3c1.5-2.5 3-4 5-4h3m-4-4 4 4-4 4"/></>,
    book: <><path d="M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    download: <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    play: <path d="m8 4 12 8-12 8z"/>, edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>, chevron: <path d="m9 5 7 7-7 7"/>,
    flag: <><path d="M5 21V3c5-3 9 3 14 0v10c-5 3-9-3-14 0"/></>,
    refresh: <><path d="M20 7a9 9 0 1 0 1 7M20 3v5h-5"/></>,
    shield: <><path d="m12 3 9 4c0 7-3 11-9 14C6 18 3 14 3 7z"/><path d="m8 12 3 3 5-6"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
};
export function Icon({ name, size = 20 }: {
    name: IconName;
    size?: number;
}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Modal({ title, description, children, onClose, wide = false }: {
    title: string;
    description?: string;
    children: ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    const { t } = useLanguage();
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        dialog?.showModal();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    return <dialog ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} aria-labelledby={titleId} onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) {
        const box = e.currentTarget.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)
            onClose();
    } }}>
    <header className="modal-header"><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="icon-button" aria-label={t("Close dialog")} onClick={onClose}><Icon name="close"/></button></header>
    {children}
  </dialog>;
}
export function downloadJson(value: unknown, name: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 100) || "quiz-bank"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AnswerReview({ question, selected }: {
    question: Question;
    selected?: string[];
}) {
    const { t } = useLanguage();
    return <>
    <div className="reference-label">{t("Original answer order")}</div>
    <div className="review-choices">{question.choices.map((choice) => {
            const correct = question.correctChoiceIds.includes(choice.id);
            const chosen = selected?.includes(choice.id);
            return <div key={choice.id} className={`review-choice ${correct ? "is-correct" : chosen && question.correctChoiceIds.length ? "is-wrong" : ""}`}>
        <span className="choice-letter">{choice.sourceLabel}</span><span className="choice-text">{choice.text}</span>
        <span className="choice-tags">{chosen && <small>{t("Your answer")}</small>}{correct && <Icon name="check" size={17}/>}</span>
      </div>;
        })}</div>
    {question.explanation.trim() && <div className="explanation"><span className="eyebrow"><Icon name="book" size={15}/>{t(" Explanation")}</span><p>{question.explanation}</p></div>}<div>{question.source_page !== undefined && <small className="source-note">{t("Page {page}", { page: question.source_page })}</small>}</div>
  </>;
}
