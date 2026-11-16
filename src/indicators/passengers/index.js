import { aggregateResults, flattenReservations } from "../../shared/results.js";
import { renderSummaryTable } from "../../shared/summary-table.js?v=20";

export function renderPassengers(data) {
  const records = flattenReservations(data, "pax");
  const groups = aggregateResults(records, (record) => [record.group]);
  return renderSummaryTable({
    container: "#passenger-table",
    count: "#passenger-count",
    entityLabel: "Passageiro",
    groups,
    searchInput: "#passenger-search",
    emptyMessage: "Nenhum passageiro encontrado para este período.",
  });
}
