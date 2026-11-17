import { $, apiUnavailableState, element, emptyState } from "../../shared/dom.js?v=2";
import { flattenReservations } from "../../shared/results.js";
import { createTable, resultBadge } from "../../shared/table.js";

const HEADERS = [
  { label: "Data de emissão" },
  { label: "Número da reserva" },
  { label: "Centro de custo ID" },
  { label: "PAX" },
  { label: "Produto" },
  { label: "Categoria" },
  { label: "Resultado" },
  { label: "Detalhes" },
];

let activeResultFilter = null;
let currentReservations = [];

function reservationDetailLink(reservation) {
  const link = element("a", "reservation-detail-link");
  link.href = "#reservation-detail";
  link.dataset.reservationDetail = "";
  link.dataset.numeroReserva = reservation.numero_reserva ?? "";
  link.setAttribute("aria-label", `Ver regras da reserva ${reservation.numero_reserva ?? ""}`);
  link.title = "Ver regras da reserva";
  link.innerHTML = '<svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M8.5 3.5H4.25a1 1 0 0 0-1 1v11.25a1 1 0 0 0 1 1H15.5a1 1 0 0 0 1-1V11.5M11 3h5v5M16 3 9 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return link;
}

function reservationResultBadge(result) {
  const badge = resultBadge(result);
  badge.textContent = result == null || result === "" ? "—" : String(result);
  return badge;
}

function formatEmissionDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function renderReservationTable() {
  const reservations = activeResultFilter
    ? currentReservations.filter((reservation) => {
      const result = String(reservation.result || "").toUpperCase();
      const normalizedResult = result === "PASS" || result === "FAIL" ? result : "INDETERMINATE";
      return normalizedResult === activeResultFilter;
    })
    : currentReservations;
  const rows = reservations.map((reservation) => [
    formatEmissionDate(reservation.data_emissao),
    reservation.numero_reserva,
    reservation.centro_custo_id,
    reservation.pax ?? reservation.group,
    reservation.produto,
    reservation.categoria,
    reservationResultBadge(reservation.result),
    reservationDetailLink(reservation),
  ]);
  const sortValues = reservations.map((reservation) => [
    reservation.data_emissao,
    reservation.numero_reserva,
    reservation.centro_custo_id,
    reservation.pax ?? reservation.group,
    reservation.produto,
    reservation.categoria,
    reservation.result,
    "",
  ]);

  $("#reservation-count").textContent = String(reservations.length);
  const content = currentReservations.length === 0
    ? apiUnavailableState()
    : reservations.length === 0
      ? emptyState("Nenhuma reserva corresponde ao filtro selecionado.")
      : createTable(HEADERS, rows, "Nenhuma reserva encontrada para este período.", {
        sortable: true,
        sortValues,
        searchInput: "#reservation-search",
      });
  $("#reservation-table").replaceChildren(content);
}

function bindResultFilters() {
  document.querySelectorAll("[data-result-filter]").forEach((button) => {
    button.onclick = () => {
      activeResultFilter = activeResultFilter === button.dataset.resultFilter
        ? null
        : button.dataset.resultFilter;
      document.querySelectorAll("[data-result-filter]").forEach((filterButton) => {
        const isActive = filterButton.dataset.resultFilter === activeResultFilter;
        filterButton.setAttribute("aria-pressed", String(isActive));
        filterButton.classList.toggle("is-active", isActive);
      });
      renderReservationTable();
    };
  });
}

export function renderReservations(data) {
  currentReservations = flattenReservations(data, "pax");
  bindResultFilters();
  renderReservationTable();
  return currentReservations.length;
}
