export type CheckoutViewportStyle = {
  bottom: string;
  maxHeight: string;
};

type CheckoutViewportWindow = Pick<EventTarget, "addEventListener" | "removeEventListener"> & {
  readonly innerHeight: number;
  readonly visualViewport: (Pick<VisualViewport, "height" | "offsetTop"> & EventTarget) | null;
};

/** Keep the whole scrollable sheet inside the visible area, not just its white background. */
export function observeCheckoutViewport(
  browser: CheckoutViewportWindow,
  apply: (style: CheckoutViewportStyle) => void,
) {
  const viewport = browser.visualViewport;
  const update = () => {
    const height = viewport?.height ?? browser.innerHeight;
    if (height <= 0) return;
    apply({
      // iOS may pan the viewport as well as shrink it when focusing a field.
      bottom: `${Math.max(0, browser.innerHeight - height - (viewport?.offsetTop ?? 0))}px`,
      maxHeight: `${height * 0.94}px`,
    });
  };

  update();
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  browser.addEventListener("resize", update);
  return () => {
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
    browser.removeEventListener("resize", update);
  };
}
