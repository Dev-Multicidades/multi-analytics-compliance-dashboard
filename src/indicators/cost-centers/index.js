import { $, element } from "../../shared/dom.js";
import { formatDisplayName, formatNumber, formatPercent } from "../../shared/format.js?v=20";
import { aggregateResults, flattenReservations } from "../../shared/results.js";
import { createTable } from "../../shared/table.js";

export function renderCostCenters(data) {
  const records = flattenReservations(data, "centro_custo_id");
  const groups = aggregateResults(records, (record) => [
    record.group,
    record.cliente,
    record.produto,
    record.categoria,
  ]);
  const sortValues = groups.map((group) => [
    ...group.dimensions,
    group.adherent,
    group.nonAdherent,
    group.indeterminate,
    group.adherence,
  ]);
  const rows = groups.map((group) => [
    ...group.dimensions.map(formatDisplayName),
    formatNumber(group.adherent),
    formatNumber(group.nonAdherent),
    formatNumber(group.indeterminate),
    element("strong", "adherence-value", formatPercent(group.adherence)),
  ]);
  const headers = [
    { label: "Centro de custo" },
    { label: "Cliente" },
    { label: "Produto" },
    { label: "Categoria" },
    { label: "Aderente", badge: "pass" },
    { label: "Não aderente", badge: "fail" },
    { label: "Indeterminado", badge: "indeterminate" },
    { label: "% aderência" },
  ];

  $("#cost-center-count").textContent = formatNumber(groups.length);
  $("#cost-center-table").replaceChildren(createTable(
    headers,
    rows,
    "Nenhum centro de custo encontrado para este período.",
    {
      sortable: true,
      sortValues,
      searchInput: "#cost-center-search",
      searchColumns: [0],
    },
  ));

  return {
    headers: ["Centro de custo", "Cliente", "Produto", "Categoria", "Aderente", "Não aderente", "Indeterminado", "% aderência"],
    rows: rows.map((row) => row.map((value) =>
      value instanceof Node ? value.textContent : value,
    )),
  };
}
