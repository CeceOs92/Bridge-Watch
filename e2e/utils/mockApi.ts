import { type Page } from "@playwright/test";
import { 
  buildAssetWithHealth, 
  buildBridge 
} from "../../frontend/src/test/factories";

const assetsFixture = [
  buildAssetWithHealth({ symbol: "XLM", name: "Stellar Lumens" }, 100),
  buildAssetWithHealth({ symbol: "USDC", name: "USD Coin" }, 101),
];

const assetHealthFixture = {
  XLM: assetsFixture[0].health,
  USDC: assetsFixture[1].health,
};

const bridgesFixture = {
  bridges: [
    buildBridge({ name: "Stellar-Ethereum", status: "healthy" }, 200),
    buildBridge({ name: "Stellar-Celo", status: "degraded" }, 201),
  ]
};

const jsonHeaders = { "content-type": "application/json" };

export async function mockCoreApi(page: Page): Promise<void> {
  await page.route("**/api/v1/assets", async (route) => {
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(assetsFixture),
    });
  });

  await page.route("**/api/v1/assets/*/health*", async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/v1\/assets\/([^/]+)\/health/);
    const symbol = match?.[1] ?? "";
    const body = (assetHealthFixture as Record<string, unknown>)[symbol] ?? null;

    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(body),
    });
  });

  await page.route("**/api/v1/bridges", async (route) => {
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(bridgesFixture),
    });
  });

  await page.route("**/health", async (route) => {
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
    });
  });
}
