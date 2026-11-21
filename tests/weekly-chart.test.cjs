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
    [[["2026-10-23",1.2]], [["2026-10-23",0.3]], [["2026-10-23",0.7]]],
  );
  assert.equal(size.series[0].name, weeklyLabels.zh.strength);
});

test("size charts reserve the time of a long gap and break the line", () => {
  const rows = ["2026-08-28", "2026-11-20"].map((date, i) => ({date, relative_strength: .6 + i * .1}));
  const option = weeklyChartOption("size", rows, weeklyLabels.zh);
  assert.equal(option.xAxis.type, "time");
  assert.equal(option.series[0].data[1][1], null);
  const { reportLineGeometry } = require("../src/lib/report-document-geometry.ts");
  const staticChart = reportLineGeometry({id: "weekly-size", series: [{label: "ratio", values: rows.map(r => ({date:r.date, value:r.relative_strength}))}]});
  assert.equal(staticChart.series[0].segments.length, 2);
});
