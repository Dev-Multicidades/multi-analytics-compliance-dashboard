import { $, element } from "./dom.js";
import {
  formatDisplayName,
  formatNumber,
  formatPercent,
} from "./format.js?v=20";
import { createTable } from "./table.js";

const HEADERS = [
  null,
  { label: "Aderente", badge: "pass" },
  { label: "Não aderente", badge: "fail" },
  { label: "Indeterminado", badge: "indeterminate" },
  { label: "% aderência" },
];

export function renderSummaryTable({
  container,
  count,
  entityLabel,
  groups,
  searchInput,
  emptyMessage,
}) {
  const headers = [{ label: entityLabel }, ...HEADERS.slice(1)];
  const sortValues = groups.map((group) => [
    group.dimensions[0],
    group.adherent,
    group.nonAdherent,
    group.indeterminate,
    group.adherence,
  ]);
  const rows = groups.map((group) => [
    formatDisplayName(group.dimensions[0]),
    formatNumber(group.adherent),
    formatNumber(group.nonAdherent),
    formatNumber(group.indeterminate),
    element("strong", "adherence-value", formatPercent(group.adherence)),
  ]);

  $(count).textContent = formatNumber(groups.length);
  $(container).replaceChildren(createTable(headers, rows, emptyMessage, {
    sortable: true,
    sortValues,
    searchInput,
    searchColumns: [0],
  }));

  return {
    headers: [entityLabel, "Aderente", "Não aderente", "Indeterminado", "% aderência"],
    rows: rows.map((row) => row.map((value) =>
      value instanceof Node ? value.textContent : value,
    )),
  };
}
