import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { weeklyContentHash } from "../src/lib/weekly-recap";
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
  const older = JSON.parse(raw.replaceAll("2026-10-23", "2026-10-16").replaceAll("2026-10-24", "2026-10-17"));
  older.content_hash = weeklyContentHash(older);
  writeFileSync(
    path.join(root, "data/weekly_recaps.json"),
    '{"schema_version":"market_intel_pages.weekly_recaps.v1","reports":[' +
      raw + "," + JSON.stringify(older) +
      "]}",
  );
  for (const ext of ["md", "png"])
    cpSync(
      `tests/fixtures/weekly/2026-10-23-weekly.${ext}`,
      path.join(root, `reports/2026-10-23-weekly.${ext}`),
    );
  for (const ext of ["md", "png"])
    cpSync(`tests/fixtures/weekly/2026-10-23-weekly.${ext}`, path.join(root, `reports/2026-10-16-weekly.${ext}`));
  return root;
}
