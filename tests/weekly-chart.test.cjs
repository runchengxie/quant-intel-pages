const { test } = require("node:test");
const assert = require("node:assert/strict");
const { weeklyChartOption } = require("../src/lib/weekly-charts.ts");
const { weeklyLabels } = require("../src/lib/weekly-locale.ts");
test("weekly charts keep original values and dates on separate unit axes", () => {
  const rows = [
    { date: "2026-10-16", return_12w_percent: -2, wealth_index: 0.98 },
    { date: "2026-10-23", return_12w_percent: 3, wealth_index: 1.03 },
  ];
  const option = weeklyChartOption("value", rows, weeklyLabels.en);
  assert.deepEqual(
    option.xAxis.data,
    rows.map((r) => r.date),
  );
  assert.deepEqual(option.series[0].data, [-2, 3]);
  assert.deepEqual(option.series[1].data, [0.98, 1.03]);
  assert.equal(option.series[1].yAxisIndex, 1);
  assert.equal(option.tooltip.trigger, "axis");
  assert.equal(option.dataZoom.length, 2);
  assert.equal(option.legend.top, 0);
  const size = weeklyChartOption(
    "size",
    [
      {
        date: "2026-10-23",
        relative_strength: 1.2,
        small_crowding: 0.3,
        large_crowding: 0.7,
      },
    ],
    weeklyLabels.zh,
  );
  assert.equal(size.yAxis[1].max, 1);
  assert.equal(size.series[0].showSymbol, true);
  assert.deepEqual(
    size.series.map((s) => s.data),
    [[1.2], [0.3], [0.7]],
  );
  assert.equal(size.series[0].name, weeklyLabels.zh.strength);
});
