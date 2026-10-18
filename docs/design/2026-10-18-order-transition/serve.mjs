import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = new Map([
  ["/", ["./index.html", "text/html; charset=utf-8"]],
  ["/prototype.css", ["./prototype.css", "text/css"]],
  ["/product.css", ["./product.css", "text/css"]],
  ["/transitions.css", ["./transitions.css", "text/css"]],
  ["/picker.css", ["./picker.css", "text/css"]],
  ["/product.js", ["./product.js", "text/javascript"]],
  ["/places.js", ["./places.js", "text/javascript"]],
  ["/locations.js", ["./locations.js", "text/javascript"]],
  ["/app.js", ["./app.js", "text/javascript"]],
  ["/shared.js", ["./shared.js", "text/javascript"]],
  ["/variants/memo.js", ["./variants/memo.js", "text/javascript"]],
  ["/site/logo.webp", ["../../../attached_assets/sera-khabar-leaf-logo.webp", "image/webp"]],
  ["/site/leaf.webp", ["../../../client/public/home/leaf-mark.webp", "image/webp"]],
  ["/site/bag.webp", ["../../../client/public/order/order-kraft-bag-1.webp", "image/webp"]],
]);
const port = Number(process.env.PORT || 5145);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const file = files.get(pathname);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Prototype file not found. No commerce endpoints are available here.");
    return;
  }
  try {
    const content = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    response.end(content);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain" });
    response.end("Could not load this prototype asset.");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Product → checkout transition mockup: http://localhost:${port}/ (PID ${process.pid}). Preview only; no real orders.`));
