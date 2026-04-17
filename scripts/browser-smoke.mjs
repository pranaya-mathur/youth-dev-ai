/**
 * Headless browser smoke: Next.js home, dev API proxy, onboarding → consent.
 *
 * Prereqs: API on :8000, `npm run dev` in frontend on :3000, Playwright browser:
 *   npx playwright install chromium
 *
 * Run from repo root:
 *   node scripts/browser-smoke.mjs
 */
import { chromium } from "playwright";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const consoleErrors = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("heading", { level: 1 }).getByText("Feel seen").waitFor({ timeout: 60000 });

  const health = await page.evaluate(async () => {
    const r = await fetch("/api-proxy/health");
    if (!r.ok) return { ok: false, status: r.status, body: await r.text() };
    return await r.json();
  });
  if (!health.ok) {
    throw new Error(`API health via Next proxy failed: ${JSON.stringify(health)}`);
  }

  await page.getByRole("link", { name: /Begin the journey/i }).first().click();
  await page.waitForURL(/\/onboarding$/, { timeout: 60000 });
  await page.getByText("Let us set the mood", { exact: false }).waitFor({ timeout: 30000 });

  await page.getByRole("button", { name: "11–13" }).click();
  await page.getByRole("button", { name: "Continue to scenarios" }).click();
  await page.waitForURL(/\/consent$/, { timeout: 60000 });

  await browser.close();

  if (consoleErrors.length) {
    console.warn("Browser console errors (non-fatal):", consoleErrors.slice(0, 10));
  }
  console.log("OK: home → onboarding → consent; /api-proxy/health ok.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
