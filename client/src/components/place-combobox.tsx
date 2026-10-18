import { forwardRef, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { searchDistricts, thanasOf } from "@/lib/bd-locations";

type Option = { id: string; bn: string; en: string; city?: boolean };

type PlaceComboboxProps = {
  kind: "district" | "thana";
  districtId: string | null;
  value: string | null;
  selectedLabel: string;
  error?: string;
  onPick: (id: string) => void;
};

const COPY = {
  district: { label: "জেলা", english: "District", placeholder: "জেলা খুঁজুন", none: "নামে কোনো জেলা পাইনি" },
  thana: { label: "থানা / উপজেলা", english: "Thana", placeholder: "থানা খুঁজুন", none: "নামে কোনো থানা পাইনি" },
} as const;

function optionsFor(kind: PlaceComboboxProps["kind"], districtId: string | null, query: string): Option[] {
  return kind === "district"
    ? searchDistricts(query).map(([id, bn, en]) => ({ id, bn, en }))
    : thanasOf(districtId, query).map(([id, , bn, en, city]) => ({ id, bn, en, city: city === 1 }));
}

/** Search box + list (a combobox): opens on focus, filters as you type, arrows/Enter/Escape work. */
export const PlaceCombobox = forwardRef<HTMLInputElement, PlaceComboboxProps>(function PlaceCombobox(
  { kind, districtId, value, selectedLabel, error, onPick },
  ref,
) {
  const copy = COPY[kind];
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  // null until the customer types, so focusing a filled box still lists every option.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const disabled = kind === "thana" && !districtId;
  const options = open ? optionsFor(kind, districtId, query ?? "") : [];
  const grouped = kind === "thana" && !query && options.some((option) => option.city);

  useEffect(() => {
    if (!open) return;
    // Scroll only the list: scrollIntoView would also move the page.
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>("[data-active]");
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active, query]);

  const openList = () => {
    const rows = optionsFor(kind, districtId, "");
    setQuery(null);
    setActive(Math.max(0, rows.findIndex((option) => option.id === value)));
    setOpen(true);
  };
  const closeList = () => {
    setOpen(false);
    setQuery(null);
  };
  const pick = (option: Option | undefined) => {
    if (!option) return;
    closeList();
    onPick(option.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeList();
    }
  };

  const errorId = `${id}-error`;
  const activeOption = open ? options[active] : undefined;

  return (
    <div className="skx-field skx-combo" data-open={open || undefined}>
      <label htmlFor={inputId}>
        {copy.label}
        <small>{copy.english}</small>
      </label>
      <div className="skx-combo-box">
        <input
          ref={ref}
          id={inputId}
          name={kind}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${listId}-${activeOption.id}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={copy.placeholder}
          disabled={disabled}
          value={query ?? selectedLabel}
          onFocus={(event) => {
            openList();
            event.currentTarget.select();
            // On phones the list opens downward into the keyboard; lift the field to the top first.
            // After a frame, so the browser's own scroll-to-focus doesn't cancel it.
            const field = event.currentTarget.closest(".skx-combo");
            if (field && window.matchMedia("(max-width: 599px)").matches) {
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              requestAnimationFrame(() => field.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }));
            }
          }}
          onBlur={closeList}
          onChange={(event) => {
            if (!open) setOpen(true);
            setQuery(event.target.value);
            setActive(0);
            if (listRef.current) listRef.current.scrollTop = 0;
          }}
          onKeyDown={onKeyDown}
        />
        <Search aria-hidden="true" />
        <ul
          ref={listRef}
          className="skx-combo-list"
          role="listbox"
          id={listId}
          aria-label={copy.label}
          // Keep focus in the search box while an option is tapped.
          onMouseDown={(event) => event.preventDefault()}
        >
          {open && !options.length ? (
            <li className="skx-combo-none">“{query}” {copy.none}</li>
          ) : null}
          {options.map((option, index) => (
            <PlaceOption
              key={option.id}
              option={option}
              heading={grouped && (index === 0 || options[index - 1].city !== option.city) ? (option.city ? "সিটি থানা" : "উপজেলা") : null}
              id={`${listId}-${option.id}`}
              active={index === active}
              selected={option.id === value}
              onPick={() => pick(option)}
            />
          ))}
        </ul>
      </div>
      {error ? <span className="skx-field-error" id={errorId} role="alert">{error}</span> : null}
    </div>
  );
});

function PlaceOption({ option, heading, id, active, selected, onPick }: {
  option: Option;
  heading: string | null;
  id: string;
  active: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <>
      {heading ? <li className="skx-combo-group" role="presentation">{heading}</li> : null}
      <li role="option" id={id} aria-selected={selected} data-active={active || undefined} onClick={onPick}>
        {option.bn}
        <small>{option.en}</small>
      </li>
    </>
  );
}
