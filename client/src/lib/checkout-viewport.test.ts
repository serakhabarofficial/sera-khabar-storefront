import assert from "node:assert/strict";
import test from "node:test";
import { observeCheckoutViewport, type CheckoutViewportStyle } from "./checkout-viewport";

class TestViewport extends EventTarget {
  height = 1000;
  offsetTop = 0;
}

class TestWindow extends EventTarget {
  innerHeight = 1000;
  visualViewport: TestViewport | null = new TestViewport();
}

test("checkout fills the visible viewport above the keyboard, including its vertical offset", () => {
  const browser = new TestWindow();
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "940px" });

  browser.visualViewport!.height = 500;
  browser.visualViewport!.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles.at(-1), { bottom: "500px", maxHeight: "470px" });

  // iOS can pan the visible viewport without changing its height.
  browser.visualViewport!.offsetTop = 200;
  browser.visualViewport!.dispatchEvent(new Event("scroll"));
  assert.deepEqual(styles.at(-1), { bottom: "300px", maxHeight: "470px" });

  browser.visualViewport!.height = 1000;
  browser.visualViewport!.offsetTop = 0;
  browser.visualViewport!.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "940px" });
  stop();
});

test("checkout updates after orientation or layout viewport changes", () => {
  const browser = new TestWindow();
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  browser.innerHeight = 600;
  browser.visualViewport!.height = 300;
  browser.visualViewport!.offsetTop = 50;
  browser.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles.at(-1), { bottom: "250px", maxHeight: "282px" });
  stop();
});

test("browsers without VisualViewport use the available window height", () => {
  const browser = new TestWindow();
  browser.visualViewport = null;
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "940px" });
  browser.innerHeight = 600;
  browser.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "564px" });
  stop();
});

test("transient zero-height viewports do not collapse checkout", () => {
  const browser = new TestWindow();
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  browser.visualViewport!.height = 0;
  browser.visualViewport!.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "940px" });
  stop();
});

test("viewport movement beyond the layout viewport never gives checkout a negative bottom inset", () => {
  const browser = new TestWindow();
  browser.visualViewport!.offsetTop = 50;
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  assert.deepEqual(styles.at(-1), { bottom: "0px", maxHeight: "940px" });
  stop();
});

test("closing checkout removes both viewport and window listeners", () => {
  const browser = new TestWindow();
  const styles: CheckoutViewportStyle[] = [];
  const stop = observeCheckoutViewport(browser, (style) => styles.push(style));
  stop();
  browser.visualViewport!.height = 500;
  browser.visualViewport!.offsetTop = 200;
  browser.visualViewport!.dispatchEvent(new Event("resize"));
  browser.visualViewport!.dispatchEvent(new Event("scroll"));
  browser.dispatchEvent(new Event("resize"));
  assert.deepEqual(styles, [{ bottom: "0px", maxHeight: "940px" }]);
});
