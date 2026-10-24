import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
/** Isolated synthetic input; never changes the public source artifact tree. */
export function weeklyBrowserInput(): string {
  const root = mkdtempSync(path.join(tmpdir(), "weekly-browser-input-"));
  cpSync(process.env.ASTRO_DATA_ROOT || "artifacts/public", root, {
    recursive: true,
  });
  mkdirSync(path.join(root, "data"), { recursive: true });
  mkdirSync(path.join(root, "reports"), { recursive: true });
  const raw = readFileSync("tests/fixtures/weekly/weekly_recap.json", "utf8");
  writeFileSync(path.join(root, "data/weekly_recap.json"), raw);
  writeFileSync(
    path.join(root, "data/weekly_recaps.json"),
    '{"schema_version":"market_intel_pages.weekly_recaps.v1","reports":[' +
      raw +
      "]}",
  );
  for (const ext of ["md", "png"])
    cpSync(
      `tests/fixtures/weekly/2026-10-23-weekly.${ext}`,
      path.join(root, `reports/2026-10-23-weekly.${ext}`),
    );
  return root;
}
