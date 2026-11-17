import { $, apiUnavailableState } from "../../shared/dom.js?v=2";
import { formatNumber, formatPercent } from "../../shared/format.js?v=20";

export function renderSummary(summary) {
  const metrics = $("#summary-metrics");
  const emptyState = $("#summary-api-empty-state");
  const fields = [
    "total",
    "aderencia_percentual",
    "nao_aderente",
    "indeterminate",
    "cobertura_percentual",
    "aderente",
  ];
  const hasData = summary
    && typeof summary === "object"
    && fields.some((field) => summary[field] !== null && summary[field] !== undefined && summary[field] !== "");
  if (!hasData) {
    metrics.classList.add("api-data-hidden");
    emptyState.replaceChildren(apiUnavailableState());
    emptyState.hidden = false;
    return;
  }

  metrics.classList.remove("api-data-hidden");
  emptyState.hidden = true;
  const values = [
    formatNumber(summary.total),
    formatPercent(summary.aderencia_percentual),
    formatNumber(summary.nao_aderente),
    formatNumber(summary.indeterminate),
    formatPercent(summary.cobertura_percentual),
  ];
  metrics.querySelectorAll(".metric-value").forEach((metric, index) => {
    metric.textContent = values[index];
  });
  metrics.querySelectorAll(".metric-footnote")[1].textContent =
    `${formatNumber(summary.aderente)} reservas aderentes`;
}
