import type { weeklyLabels } from "./weekly-locale.ts";
export function weeklyChartOption(
  kind: string,
  rows: Record<string, any>[],
  labels: typeof weeklyLabels.en | typeof weeklyLabels.zh,
) {
  const columns =
    kind === "value"
      ? [
          ["return_12w_percent", labels.returns],
          ["wealth_index", labels.wealth],
        ]
      : [
          ["relative_strength", labels.strength],
          ["small_crowding", labels.small],
          ["large_crowding", labels.large],
        ];
  return {
    tooltip: { trigger: "axis" },
    legend: { type: "scroll", top: 0 },
    grid: { left: 65, right: 65, top: 60, bottom: 80 },
    xAxis: { type: "category", data: rows.map((r: any) => r.date) },
    yAxis: [
      {
        type: "value",
        name: kind === "value" ? "%" : labels.strength,
        scale: true,
      },
      {
        type: "value",
        name: kind === "value" ? labels.wealth : "0–1",
        scale: true,
        ...(kind === "size" ? { min: 0, max: 1 } : {}),
      },
    ],
    dataZoom: [{ type: "inside" }, { type: "slider" }],
    series: columns.map(([key, name], index) => ({
      name,
      type: "line",
      showSymbol: rows.length <= 2,
      yAxisIndex: index === 0 ? 0 : 1,
      data: rows.map((r: any) => r[key]),
    })),
  };
}
export function initializeWeeklyCharts(): void {
  document
    .querySelectorAll<HTMLDetailsElement>("[data-weekly-interactive]")
    .forEach((details) => {
      let loaded = false;
      details.addEventListener("toggle", async () => {
        if (!details.open || loaded) return;
        loaded = true;
        const host = details.querySelector<HTMLElement>("[data-weekly-charts]");
        if (!host) return;
        const labels = JSON.parse(host.dataset.labels!);
        const series = JSON.parse(host.dataset.series!);
        try {
          const { createWeeklyChart } =
            await import("./weekly-chart-renderer.ts");
          for (const kind of ["value", "size"]) {
            const target = host.querySelector<HTMLElement>(
              `[data-weekly-${kind}]`,
            )!;
            createWeeklyChart(
              target,
              weeklyChartOption(kind, series[kind], labels),
            );
          }
        } catch {
          host.querySelector("[data-chart-status]")!.textContent = labels.error;
          loaded = false;
        }
      });
    });
}
