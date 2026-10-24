import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { dataRoot } from "./reports.ts";
type RecordValue = Record<string, any>;
export type WeeklyRecap = RecordValue & {
  date: string;
  report_id: string;
  markdown: string;
  content_hash: string;
  image: { source_url: string; sha256: string; width: number; height: number };
};
function requireValid(valid: unknown): asserts valid {
  if (!valid) throw new Error("Invalid public weekly recap");
}
function keys(value: unknown, expected: string): asserts value is RecordValue {
  requireValid(value && typeof value === "object" && !Array.isArray(value));
  requireValid(
    Object.keys(value).sort().join(",") ===
      expected.split(" ").sort().join(","),
  );
}
const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(value).toISOString().slice(0, 10) === value;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const hash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const crowding = (value: unknown) => finite(value) && value >= 0 && value <= 1;
/** Python canonical JSON preserves float/exponent spelling from the original file. */
function canonicalDigests(
  raw: string,
  index: boolean,
  strictIntegers = false,
): string[] {
  const program = `import sys,json,hashlib
p=json.load(sys.stdin)
reports=p["reports"] if sys.argv[1]=="index" else [p]
if sys.argv[2]=="strict":
    for report in reports:
        assert all(type(report["image"][key]) is int for key in ("width","height"))
        assert type(report["summary"]["value_streak_weeks"]) is int
print(json.dumps([hashlib.sha256(json.dumps({k:v for k,v in r.items() if k!="content_hash"},sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False).encode()).hexdigest() for r in reports]))`;
  const result = spawnSync(
    "python3",
    [
      "-c",
      program,
      index ? "index" : "single",
      strictIntegers ? "strict" : "hash",
    ],
    { input: raw, encoding: "utf8", maxBuffer: 8_000_000, timeout: 10000 },
  );
  requireValid(result.status === 0);
  return JSON.parse(result.stdout);
}
export function weeklyContentHash(
  payload: object,
  raw = JSON.stringify(payload),
): string {
  return canonicalDigests(raw, false)[0];
}
export function validateWeeklyRecap(input: unknown, raw?: string): WeeklyRecap {
  const report = validateWeeklyStructure(input);
  requireValid(
    canonicalDigests(raw ?? JSON.stringify(input), false, true)[0] ===
      report.content_hash,
  );
  return report;
}
function validateWeeklyStructure(input: unknown): WeeklyRecap {
  keys(
    input,
    "schema_version publication report_id date generated_at content_hash markdown source_url image summary series sources",
  );
  const p = input;
  requireValid(
    p.schema_version === "market_intel_pages.weekly_recap.v1" &&
      p.publication === "public" &&
      isDate(p.date) &&
      new Date(p.date).getUTCDay() === 5,
  );
  requireValid(
    p.report_id === `${p.date}-weekly` &&
      p.source_url === `reports/${p.date}-weekly.md`,
  );
  requireValid(
    typeof p.generated_at === "string" &&
      /(?:Z|[+-]\d{2}:\d{2})$/.test(p.generated_at) &&
      Number.isFinite(Date.parse(p.generated_at)) &&
      p.generated_at.slice(0, 10) >= p.date,
  );
  requireValid(
    typeof p.markdown === "string" &&
      p.markdown.trim() &&
      !p.markdown.includes("\0") &&
      Buffer.byteLength(p.markdown) <= 1_000_000,
  );
  keys(p.image, "source_url sha256 width height");
  requireValid(
    p.image.source_url === `reports/${p.date}-weekly.png` &&
      hash(p.image.sha256),
  );
  requireValid(
    ["width", "height"].every(
      (k) =>
        Number.isInteger(p.image[k]) && p.image[k] > 0 && p.image[k] <= 20000,
    ),
  );
  keys(
    p.summary,
    "value_regime value_streak_weeks value_return_12w_percent small_crowding large_crowding size_signal",
  );
  requireValid(
    ["MOMENTUM", "NEUTRAL"].includes(p.summary.value_regime) &&
      ["large_cap", "small_cap", "insufficient"].includes(
        p.summary.size_signal,
      ),
  );
  requireValid(
    Number.isInteger(p.summary.value_streak_weeks) &&
      p.summary.value_streak_weeks >= 1 &&
      finite(p.summary.value_return_12w_percent) &&
      crowding(p.summary.small_crowding) &&
      crowding(p.summary.large_crowding),
  );
  keys(p.series, "value size");
  for (const kind of ["value", "size"]) {
    const rows = p.series[kind];
    requireValid(
      Array.isArray(rows) &&
        rows.length > 0 &&
        rows.length <= (kind === "value" ? 104 : 252),
    );
    let previous = "";
    for (const row of rows) {
      keys(
        row,
        kind === "value"
          ? "date return_12w_percent wealth_index"
          : "date relative_strength small_crowding large_crowding",
      );
      requireValid(
        isDate(row.date) && row.date > previous && row.date <= p.date,
      );
      previous = row.date;
      requireValid(
        kind === "value"
          ? finite(row.return_12w_percent) &&
              finite(row.wealth_index) &&
              row.wealth_index >= 1e-300
          : finite(row.relative_strength) &&
              row.relative_strength >= 1e-300 &&
              crowding(row.small_crowding) &&
              crowding(row.large_crowding),
      );
    }
    requireValid(previous === p.date);
  }
  keys(p.sources, "value size");
  for (const source of Object.values(p.sources)) {
    keys(source, "schema_version as_of sha256");
    requireValid(
      source.schema_version === "research.weekly_analysis.v1" &&
        isDate(source.as_of) &&
        source.as_of === p.date &&
        hash(source.sha256),
    );
  }
  requireValid(hash(p.content_hash));
  return p as WeeklyRecap;
}
function publicFile(relative: string, limit = 8_000_000): Buffer {
  const root = dataRoot();
  const file = path.join(root, relative);
  requireValid(
    lstatSync(file).size <= limit &&
      !lstatSync(file).isSymbolicLink() &&
      realpathSync(file).startsWith(realpathSync(root) + path.sep),
  );
  return readFileSync(file);
}
export function loadWeeklyRecaps(): WeeklyRecap[] {
  const file = path.join(dataRoot(), "data/weekly_recaps.json");
  if (!existsSync(file)) {
    requireValid(!existsSync(path.join(dataRoot(), "data/weekly_recap.json")));
    return [];
  }
  const raw = publicFile("data/weekly_recaps.json").toString("utf8");
  requireValid(Buffer.byteLength(raw) <= 8_000_000);
  const index = JSON.parse(raw);
  keys(index, "schema_version reports");
  requireValid(
    index.schema_version === "market_intel_pages.weekly_recaps.v1" &&
      Array.isArray(index.reports) &&
      index.reports.length > 0 &&
      index.reports.length <= 5,
  );
  const hashes = canonicalDigests(raw, true, true);
  let previous = "9999";
  const reports = index.reports.map((p: RecordValue, i: number) => {
    requireValid(hashes[i] === p.content_hash);
    const report = validateWeeklyStructure(p);
    requireValid(report.date < previous);
    previous = report.date;
    requireValid(
      publicFile(report.source_url).toString("utf8") === report.markdown,
    );
    const image = publicFile(report.image.source_url, 20_000_000);
    requireValid(
      image.length <= 20_000_000 &&
        image.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
        image.readUInt32BE(16) === report.image.width &&
        image.readUInt32BE(20) === report.image.height &&
        createHash("sha256").update(image).digest("hex") ===
          report.image.sha256,
    );
    return report;
  });
  const latestRaw = publicFile("data/weekly_recap.json").toString("utf8");
  const latest = validateWeeklyRecap(JSON.parse(latestRaw), latestRaw);
  requireValid(latest.content_hash === reports[0].content_hash);
  return reports;
}
