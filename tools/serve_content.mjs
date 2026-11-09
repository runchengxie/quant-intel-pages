/** Serve the exact external build during managed browser acceptance. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

if (!process.env.CONTENT_SITE_ROOT) throw new Error("CONTENT_SITE_ROOT is required");
const root = path.resolve(process.env.CONTENT_SITE_ROOT);
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".md": "text/plain; charset=utf-8", ".txt": "text/plain" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (!url.pathname.startsWith("/quant-intel-pages/")) throw new Error("prefix");
    const relative = decodeURIComponent(url.pathname.slice("/quant-intel-pages/".length));
    let file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error("path");
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
});
server.listen(Number(process.env.PLAYWRIGHT_PORT || "4399"), "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
