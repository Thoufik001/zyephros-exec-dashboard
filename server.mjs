import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT || "5173", 10);
const host = process.env.HOST || "127.0.0.1";
const publicRoot = resolve(fileURLToPath(new URL("./public", import.meta.url)));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const roleBootstrap = `<script data-zyephr-role-bootstrap>
(function(){try{var p=new URLSearchParams(location.search);var r=(p.get("role")||"").replace(/[\\s-]+/g,"_").toUpperCase();if(!r&&location.pathname.replace(/\\/$/,"")==="/hrms")r="HR_ADMIN";if(r==="CEO"||r==="COO"||r==="HR_ADMIN")localStorage.setItem("zyephr.role",r);}catch(e){}})();
</script>`;
const dataBootstrap = `<script data-zyephr-derived-data src="/data/zyephr-derived-data.js"></script>`;

function fileForRequest(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);

  if (pathname === "/") {
    return { redirect: "/overview" };
  }

  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const directFile = join(publicRoot, normalizedPath);

  if (existsSync(directFile) && statSync(directFile).isFile()) {
    return { file: directFile };
  }

  const indexFile = join(publicRoot, normalizedPath, "index.html");
  if (existsSync(indexFile)) {
    return { file: indexFile };
  }

  return { missing: true };
}

createServer(async (request, response) => {
  const result = fileForRequest(request.url || "/");

  if (result.redirect) {
    response.writeHead(302, { Location: result.redirect });
    response.end();
    return;
  }

  if (result.missing) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = mimeTypes[extname(result.file)] || "application/octet-stream";
  if (contentType.startsWith("text/html")) {
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    let html = await readFile(result.file, "utf8");
    if (!html.includes("data-zyephr-role-bootstrap")) {
      html = html.replace(/<head(.*?)>/i, `<head$1>${roleBootstrap}`);
    }
    if (!html.includes("data-zyephr-derived-data")) {
      html = html.replace(/<head(.*?)>/i, `<head$1>${dataBootstrap}`);
    }
    response.end(html);
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  createReadStream(result.file).pipe(response);
}).listen(port, host, () => {
  console.log(`Zyephr Dashboard V6 running at http://${host}:${port}/overview`);
});
