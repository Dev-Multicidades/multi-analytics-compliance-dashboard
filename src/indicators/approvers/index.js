import { aggregateResults, flattenReservations } from "../../shared/results.js";
import { renderSummaryTable } from "../../shared/summary-table.js?v=22";

export function renderApprovers(data) {
  const records = flattenReservations(data, "autorizador");
  const groups = aggregateResults(records, (record) => [record.group]);
  return renderSummaryTable({
    container: "#approver-table",
    count: "#approver-count",
    entityLabel: "Autorizador",
    groups,
    searchInput: "#approver-search",
    emptyMessage: "Nenhum autorizador encontrado para este período.",
  });
}
