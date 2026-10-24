const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateWeeklyRecap,
  weeklyContentHash,
} = require("../src/lib/weekly-recap.ts");
const fixture = () => {
  const date = "2026-10-23";
  const source = {
    schema_version: "research.weekly_analysis.v1",
    as_of: date,
    sha256: "a".repeat(64),
  };
  const payload = {
    schema_version: "market_intel_pages.weekly_recap.v1",
    publication: "public",
    report_id: `${date}-weekly`,
    date,
    generated_at: `${date}T10:00:00+08:00`,
    markdown: "# 周报\n\n公开研究",
    source_url: `reports/${date}-weekly.md`,
    image: {
      source_url: `reports/${date}-weekly.png`,
      sha256: "b".repeat(64),
      width: 800,
      height: 1200,
    },
    summary: {
      value_regime: "NEUTRAL",
      value_streak_weeks: 2,
      value_return_12w_percent: 2.5,
      small_crowding: 0.2,
      large_crowding: 0.4,
      size_signal: "small_cap",
    },
    series: {
      value: [{ date, return_12w_percent: 2.5, wealth_index: 1 }],
      size: [
        {
          date,
          relative_strength: 1,
          small_crowding: 0.2,
          large_crowding: 0.4,
        },
      ],
    },
    sources: { value: source, size: source },
  };
  return { ...payload, content_hash: weeklyContentHash(payload) };
};
test("weekly contract admits a hash-bound public report", () =>
  assert.equal(validateWeeklyRecap(fixture()).date, "2026-10-23"));
test("weekly contract rejects tampering, private fields and malformed observations", () => {
  for (const mutate of [
    (p) => (p.summary.value_regime = "invented"),
    (p) => (p.summary.size_signal = "invented"),
    (p) => (p.summary.value_streak_weeks = 0),
    (p) => (p.customer = "private"),
    (p) => (p.series.size[0].small_crowding = 2),
    (p) => p.series.value.push({ ...p.series.value[0] }),
    (p) => (p.image.source_url = "../private.png"),
  ]) {
    const p = fixture();
    mutate(p);
    p.content_hash = weeklyContentHash(p);
    assert.throws(() => validateWeeklyRecap(p));
  }
});
module.exports = { fixture };

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { loadWeeklyRecaps } = require("../src/lib/weekly-recap.ts");
test("weekly loader preserves Python float spelling and checks every public attachment", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "weekly-contract-"));
  const old = process.env.ASTRO_DATA_ROOT;
  process.env.ASTRO_DATA_ROOT = root;
  try {
    fs.mkdirSync(path.join(root, "data"));
    fs.mkdirSync(path.join(root, "reports"));
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
      "base64",
    );
    const p = fixture();
    p.image = {
      ...p.image,
      width: 1,
      height: 1,
      sha256: crypto.createHash("sha256").update(image).digest("hex"),
    };
    let raw = JSON.stringify(p).replace(
      '"wealth_index":1',
      '"wealth_index":1.0',
    );
    p.content_hash = weeklyContentHash(p, raw);
    raw = raw.replace(JSON.parse(raw).content_hash, p.content_hash);
    fs.writeFileSync(path.join(root, "data/weekly_recap.json"), raw);
    fs.writeFileSync(
      path.join(root, "data/weekly_recaps.json"),
      '{"schema_version":"market_intel_pages.weekly_recaps.v1","reports":[' +
        raw +
        "]}",
    );
    fs.writeFileSync(path.join(root, p.source_url), p.markdown);
    fs.writeFileSync(path.join(root, p.image.source_url), image);
    assert.equal(loadWeeklyRecaps()[0].content_hash, p.content_hash);
    const indexFile = path.join(root, "data/weekly_recaps.json");
    for (const count of [2, 6]) {
      fs.writeFileSync(
        indexFile,
        '{"schema_version":"market_intel_pages.weekly_recaps.v1","reports":[' +
          Array(count).fill(raw).join(",") +
          "]}",
      );
      assert.throws(() => loadWeeklyRecaps());
    }
    fs.writeFileSync(
      indexFile,
      '{"schema_version":"market_intel_pages.weekly_recaps.v1","reports":[' +
        raw +
        "]}",
    );
    fs.appendFileSync(path.join(root, p.image.source_url), "tampered");
    assert.throws(() => loadWeeklyRecaps());
    fs.writeFileSync(path.join(root, p.image.source_url), image);

    fs.appendFileSync(path.join(root, p.source_url), "tampered");
    assert.throws(() => loadWeeklyRecaps());
  } finally {
    if (old === undefined) delete process.env.ASTRO_DATA_ROOT;
    else process.env.ASTRO_DATA_ROOT = old;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("weekly contract rejects changed content without new hash", () => {
  const p = fixture();
  p.markdown += "tampered";
  assert.throws(() => validateWeeklyRecap(p));
});

test("raw JSON preserves integer types required by the producer contract", () => {
  const p = fixture();
  let raw = JSON.stringify(p).replace('"width":800', '"width":800.0');
  const digest = weeklyContentHash(p, raw);
  raw = raw.replace(p.content_hash, digest);
  assert.throws(() => validateWeeklyRecap(JSON.parse(raw), raw));
});

test("canonical digest admits finite exponent and negative zero spellings", () => {
  const p = fixture();
  let raw = JSON.stringify(p)
    .replace('"return_12w_percent":2.5', '"return_12w_percent":-0.0')
    .replace('"wealth_index":1', '"wealth_index":1e-7');
  const digest = weeklyContentHash(p, raw);
  raw = raw.replace(p.content_hash, digest);
  assert.equal(validateWeeklyRecap(JSON.parse(raw), raw).content_hash, digest);
});
