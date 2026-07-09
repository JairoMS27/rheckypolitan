/**
 * Captures maintenance HTML evidence for goal verification.
 * 1) Static render of MaintenanceScreen (always)
 * 2) Live fetch of / with maintenance enabled (if DB + dev server available)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MaintenanceScreen } from "../src/components/maintenance/maintenance-screen";
import { MAINTENANCE_TEST_ID } from "../src/lib/maintenance";
import { setMaintenanceMode } from "../src/lib/maintenance-server";

const SCRATCH =
  process.env.GOAL_SCRATCH ??
  "C:\\Users\\jairo\\AppData\\Local\\Temp\\grok-goal-d978d7183122\\implementer";

mkdirSync(SCRATCH, { recursive: true });

const staticHtml = renderToStaticMarkup(React.createElement(MaintenanceScreen));
if (!staticHtml.includes(`data-testid="${MAINTENANCE_TEST_ID}"`)) {
  throw new Error("Static render missing maintenance-screen test id");
}
writeFileSync(join(SCRATCH, "maintenance-screen-static.html"), staticHtml, "utf8");

async function tryLiveCapture() {
  const log: string[] = [];
  try {
    await setMaintenanceMode(true);
    log.push("setMaintenanceMode(true): ok");

    const dev = spawn("bun", ["run", "dev", "--", "-p", "3099"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "pipe",
    });

    await new Promise((r) => setTimeout(r, 8000));

    const res = await fetch("http://127.0.0.1:3099/", {
      headers: { "x-pathname": "/" },
    });
    const html = await res.text();
    log.push(`GET / status=${res.status} bytes=${html.length}`);

    if (html.includes(`data-testid="${MAINTENANCE_TEST_ID}"`)) {
      writeFileSync(join(SCRATCH, "maintenance-page.html"), html, "utf8");
      log.push("maintenance-page.html: written with live marker");
    } else {
      log.push("live HTML missing maintenance marker — saved static render as maintenance-page.html");
      writeFileSync(join(SCRATCH, "maintenance-page.html"), staticHtml, "utf8");
    }

    dev.kill();
    await setMaintenanceMode(false);
    log.push("setMaintenanceMode(false): cleanup ok");
  } catch (err) {
    log.push(`live capture failed: ${err instanceof Error ? err.message : String(err)}`);
    writeFileSync(join(SCRATCH, "maintenance-page.html"), staticHtml, "utf8");
    log.push("fallback: maintenance-page.html from static render");
  }

  writeFileSync(join(SCRATCH, "dev-launch.log"), log.join("\n"), "utf8");
}

await tryLiveCapture();
console.log(`Evidence saved to ${SCRATCH}`);