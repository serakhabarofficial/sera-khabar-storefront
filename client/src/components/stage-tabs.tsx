import { useLayoutEffect, useRef } from "react";

export type StageTab = { key: string; label: string };

// Stage tabs (2026-10-19): the dark highlight is a clipped copy of the tab row, so the text and fill change
// as one surface and slide together. Styles: .st-tabs in stage.css.
export default function StageTabs({
  tabs,
  activeKey,
  onSelect,
  label,
}: {
  tabs: StageTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  label: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = () => {
      const button = root.querySelector<HTMLButtonElement>(`[data-tab="${CSS.escape(activeKey || "all")}"]`);
      if (!button) return;
      root.style.setProperty("--l", `${button.offsetLeft}px`);
      root.style.setProperty("--r", `${root.offsetWidth - button.offsetLeft - button.offsetWidth}px`);
    };
    place();
    // Re-measure when the row changes size, including when the Bangla web font arrives and widens the labels.
    const observer = new ResizeObserver(place);
    observer.observe(root);
    root.querySelectorAll(".st-tabs-list > button").forEach((button) => observer.observe(button));
    document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, [activeKey, tabs.length]);

  const buttons = (interactive: boolean) =>
    tabs.map((tab) => (
      <button
        key={tab.key || "all"}
        type="button"
        data-tab={tab.key || "all"}
        role={interactive ? "tab" : undefined}
        aria-selected={interactive ? tab.key === activeKey : undefined}
        tabIndex={interactive ? undefined : -1}
        className={interactive ? "press" : undefined}
        onClick={interactive ? () => onSelect(tab.key) : undefined}
      >
        {tab.label}
      </button>
    ));

  return (
    <div className="st-tabs" ref={rootRef}>
      <div className="st-tabs-list" role="tablist" aria-label={label}>
        {buttons(true)}
      </div>
      <div className="st-tabs-over" aria-hidden="true">
        <div className="st-tabs-list">{buttons(false)}</div>
      </div>
    </div>
  );
}
