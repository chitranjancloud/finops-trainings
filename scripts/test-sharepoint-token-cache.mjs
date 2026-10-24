// Offline regression tests: no Microsoft credentials or network required.
// Run: node scripts/test-sharepoint-token-cache.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/sharepoint.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const keys = ["SHAREPOINT_TENANT_ID", "SHAREPOINT_CLIENT_ID", "SHAREPOINT_CLIENT_SECRET"];
const previousEnv = keys.map((key) => process.env[key]);
let clock = 1_000_000;
Date.now = () => clock;
keys.forEach((key) => { process.env[key] = `test-${key}`; });

try {
  // Fresh module state for each case; test actual SharePoint helper behavior.
  for (const scenario of ["reuse", "parallel", "expiry", "failure", "credentials", "missing-expiry"]) {
    const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}#${scenario}`);
    let tokenCalls = 0;
    let graphCalls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith("https://login.microsoftonline.com/")) {
        tokenCalls += 1;
        // Let concurrent requests overlap before completing acquisition.
        await Promise.resolve();
        if (scenario === "failure" && tokenCalls === 1) {
          return Response.json({ error_description: "test failure" }, { status: 503 });
        }
        return Response.json({
          access_token: `token-${tokenCalls}`,
          ...(scenario === "missing-expiry" ? {} : { expires_in: 3600 }),
        });
      }
      graphCalls += 1;
      assert.equal(new Headers(init.headers).get("authorization"), `Bearer token-${tokenCalls}`);
      return Response.json({ "@microsoft.graph.downloadUrl": "https://example.invalid/file" });
    };
    const get = () => api.getSharePointItemDownloadUrl("drive", "item");
    if (scenario === "parallel") {
      await Promise.all([get(), get(), get()]);
      assert.equal(tokenCalls, 1);
      assert.equal(graphCalls, 3);
    } else if (scenario === "failure") {
      await assert.rejects(get(), /test failure/);
      await get();
      assert.equal(tokenCalls, 2, "failed acquisition must not poison later requests");
    } else {
      await get();
      if (scenario === "expiry") clock += 3541_000;
      if (scenario === "credentials") process.env.SHAREPOINT_CLIENT_SECRET = "rotated-test-secret";
      await get();
      assert.equal(tokenCalls, scenario === "reuse" ? 1 : 2);
      assert.equal(graphCalls, 2, "only the app token, never Graph file responses, is cached");
    }
    console.log(`PASS ${scenario}`);
  }
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  keys.forEach((key, index) => {
    if (previousEnv[index] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[index];
  });
}
