import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Ritma demo dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Ritma — Kalori, Air &amp; Senaman Harian/i);
  assert.match(html, /MOD DEMO/);
  assert.match(html, /Masuk \/ daftar/);
  assert.match(html, /3 SASARAN HARI INI/);
  assert.match(html, /Kongsi di WhatsApp/);
  assert.match(html, /Kerja luar/);
  assert.match(html, /Catat sekarang/);
  assert.match(html, /Semua angka ialah anggaran/);
  assert.doesNotMatch(html, /KERJA_LUAR/);
  assert.doesNotMatch(html, /Ebook Diet Percuma/);
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/i);
});

test("demo banner styles target the actual button element", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.demo-banner button/);
  assert.match(css, /\.ring\.over/);
});

test("scopes repeat requests to the signed-in owner", async () => {
  const [route, schema, ensureSchema] = await Promise.all([
    readFile(new URL("../app/api/entries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/ensure.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /eq\(dailyEntries\.userId, user\.userId\)/);
  assert.match(route, /eq\(dailyEntries\.clientRequestId, clientRequestId\)/);
  assert.match(schema, /uniqueIndex\("idx_daily_entries_user_request_id"\)/);
  assert.match(ensureSchema, /daily_entries\(user_id, client_request_id\)/);
});
