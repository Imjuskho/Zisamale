// Live verification: every MOYO map layer toggle must render real markers.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const LAYERS_TO_TOGGLE = [
  "CHW Presence",
  "Community Reports",
  "Outbreak Prediction",
  "Immunization",
  "Cold Chain",
  "Maternity Homes",
  "TBAs",
  "Supply Trucks",
  "Nutrition",
];

const countMapElements = (page) =>
  page
    .locator(".leaflet-marker-icon, .leaflet-overlay-pane svg path")
    .count();

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 160)));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("probe-dho@zisamale.health");
  await page.getByLabel("Password").fill("Probe#1234");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dho/, { timeout: 20000 });
  console.log("login OK →", page.url());

  await page.waitForSelector(".leaflet-map", { timeout: 20000 });
  await page.waitForTimeout(2500); // let layer fetches settle

  await page.locator(".map-toolbar-toggle").click();
  await page.waitForSelector(".map-toolbar-panel", { timeout: 5000 });
  console.log("layer panel open");

  let pass = 0;
  const results = [];
  for (const label of LAYERS_TO_TOGGLE) {
    try {
      const box = page.getByRole("checkbox", { name: label, exact: true });
      const before = await countMapElements(page);
      await box.check();
      await page.waitForTimeout(1200);
      const afterOn = await countMapElements(page);
      await box.uncheck();
      await page.waitForTimeout(400);
      const delta = afterOn - before;
      const ok = delta > 0;
      if (ok) pass += 1;
      results.push(`${ok ? "PASS" : "FAIL"} ${label}: +${delta} (${afterOn} total)`);
    } catch (e) {
      results.push(`ERROR ${label}: ${String(e).split("\n")[0].slice(0, 120)}`);
    }
  }
  console.log(results.join("\n"));

  // Close the layer dropdown so it cannot occlude the climate panel
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Climate overlays: toggle rainfall via the climate panel
  try {
    await page.locator(".climate-overlay-toggle").click();
    await page.locator(".climate-option", { hasText: "Rainfall" }).first().click();
    await page.waitForTimeout(1500);
    const circles = await page.locator(".leaflet-overlay-pane svg path").count();
    console.log(circles > 0 ? `PASS climate rainfall overlay: ${circles} circles` : "FAIL climate overlay empty");
  } catch (e) {
    console.log("ERROR climate:", String(e).split("\n")[0].slice(0, 140));
  }

  // Health weather briefing: expand the collapsed panel first
  try {
    await page.locator(".health-weather-toggle").click();
    await page.waitForTimeout(600);
    const summary = await page
      .locator(".health-weather-summary")
      .textContent()
      .catch(() => null);
    console.log(summary ? `PASS health-weather briefing: "${summary.slice(0, 70)}…"` : "FAIL health-weather summary missing");
  } catch (e) {
    console.log("ERROR briefing:", String(e).split("\n")[0].slice(0, 140));
  }

  console.log(`\nRESULT: ${pass}/${LAYERS_TO_TOGGLE.length} layer toggles render content`);
  await browser.close();
  process.exit(pass === LAYERS_TO_TOGGLE.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
