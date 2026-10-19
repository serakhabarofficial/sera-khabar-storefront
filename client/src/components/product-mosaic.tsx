import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toBanglaDigits } from "@/lib/bangla-digits";

type ProductMosaicProps = {
  images: string[];
  srcSetFor: Record<string, string>;
  name: string;
  /** Chip and cash-on-delivery seal, drawn on the big photo. */
  badges: ReactNode;
};

const altFor = (name: string, idx: number) => (idx === 0 ? name : `${name} ${idx + 1}`);

/**
 * Desktop product gallery: the first photo spans two columns, the next two sit beside it,
 * and any others fill a row below. Every photo opens a full-screen lightbox.
 * Hidden on phones by CSS, where the swipe carousel and its thumbnail capsule take over.
 */
export function ProductMosaic({ images, srcSetFor, name, badges }: ProductMosaicProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Kept separately from isOpen so the photo stays put while the lightbox fades out.
  const [index, setIndex] = useState(0);
  const count = images.length;
  const step = (by: number) => setIndex((i) => (i + by + count) % count);

  const open = (idx: number) => {
    setIndex(idx);
    setIsOpen(true);
  };

  const tile = (url: string, idx: number, className: string, sizes: string) => (
    <button
      key={url}
      type="button"
      className={className}
      onClick={() => open(idx)}
      aria-label={`${altFor(name, idx)}, বড় করে দেখুন`}
    >
      {idx === 0 ? badges : null}
      <img
        src={url}
        srcSet={srcSetFor[url]}
        sizes={srcSetFor[url] ? sizes : undefined}
        alt=""
        width={1080}
        height={1080}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    </button>
  );

  const side = images.slice(1, 3);
  const rest = images.slice(3);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else return;
    event.preventDefault();
  };

  const current = images[index] ?? images[0];

  return (
    <div className="skp-mosaic" data-count={Math.min(count, 3)} data-page-settle="">
      <div className="skp-mosaic-grid">
        {/* Same sizes as the phone carousel's first photo, so the browser reuses that download. */}
        {tile(images[0], 0, "skp-tile skp-tile-big", "(min-width: 760px) 560px, 92vw")}
        {side.map((url, i) => tile(url, i + 1, "skp-tile", "(min-width: 760px) 280px, 46vw"))}
      </div>
      {rest.length ? (
        <div
          className="skp-mosaic-row"
          style={{ "--cols": Math.min(rest.length, 3) } as CSSProperties}
        >
          {rest.map((url, i) => tile(url, i + 3, "skp-tile", "(min-width: 760px) 280px, 46vw"))}
        </div>
      ) : null}

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="skp-lb-scrim" />
          <Dialog.Content
            className="skp-lb"
            aria-describedby={undefined}
            onKeyDown={count > 1 ? onKeyDown : undefined}
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <Dialog.Title className="sr-only">{name}</Dialog.Title>
            <Dialog.Close className="skp-lb-btn skp-lb-x" aria-label="বন্ধ করুন">
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </Dialog.Close>
            <figure>
              <img
                src={current}
                srcSet={srcSetFor[current]}
                sizes={srcSetFor[current] ? "min(86vh, 86vw)" : undefined}
                alt={altFor(name, index)}
                draggable={false}
              />
            </figure>
            {count > 1 ? (
              <>
                <button type="button" className="skp-lb-btn skp-lb-prev" onClick={() => step(-1)} aria-label="আগের ছবি">
                  <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
                </button>
                <button type="button" className="skp-lb-btn skp-lb-next" onClick={() => step(1)} aria-label="পরের ছবি">
                  <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
                </button>
                <p className="skp-lb-count" aria-live="polite">
                  {toBanglaDigits(index + 1)} / {toBanglaDigits(count)}
                </p>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
