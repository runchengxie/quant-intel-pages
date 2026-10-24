import { init, use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { weeklyChartOption } from "./weekly-charts.ts";
use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);
export function createWeeklyChart(
  target: HTMLElement,
  option: ReturnType<typeof weeklyChartOption>,
): void {
  const chart = init(target);
  chart.setOption(option);
  new ResizeObserver(() => chart.resize()).observe(target);
}
