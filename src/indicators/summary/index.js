import { $ } from "../../shared/dom.js";
import { formatNumber, formatPercent } from "../../shared/format.js?v=20";

export function renderSummary(summary) {
  const values = [
    formatNumber(summary.total),
    formatPercent(summary.aderencia_percentual),
    formatNumber(summary.nao_aderente),
    formatNumber(summary.indeterminate),
    formatPercent(summary.cobertura_percentual),
  ];
  $("#summary-metrics").querySelectorAll(".metric-value").forEach((metric, index) => {
    metric.textContent = values[index];
  });
  $("#summary-metrics").querySelectorAll(".metric-footnote")[1].textContent =
    `${formatNumber(summary.aderente)} reservas aderentes`;
}
