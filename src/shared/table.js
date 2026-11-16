import { $, element, emptyState } from "./dom.js";
import { normalizeSearchText } from "./format.js";

export function createTable(headers, rows, emptyMessage, options = {}) {
  if (!rows.length) return emptyState(emptyMessage);
  const tableElement = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const sortValues = options.sortValues || rows;
  let sortColumn = 0;
  let sortDirection = 1;
  const tbody = document.createElement("tbody");

  const renderRows = () => {
    const searchTerm = options.searchInput
      ? normalizeSearchText($(options.searchInput).value.trim())
      : "";
    const orderedIndexes = rows
      .map((_, index) => index)
      .filter((index) => {
        if (!searchTerm) return true;
        const searchableValues = (options.searchColumns || rows[index].map((_, column) => column))
          .map((column) => rows[index][column])
          .map((value) => value instanceof Node ? value.textContent : String(value ?? ""));
        return searchableValues.some((value) => normalizeSearchText(value).includes(searchTerm));
      });

    if (options.sortable) {
      orderedIndexes.sort((left, right) => {
        const leftValue = sortValues[left][sortColumn];
        const rightValue = sortValues[right][sortColumn];
        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "pt-BR", {
            numeric: true,
            sensitivity: "base",
          });
        return comparison * sortDirection;
      });
    }

    tbody.replaceChildren();
    if (!orderedIndexes.length) {
      const tr = document.createElement("tr");
      const td = element("td", "table-empty-result", "Nenhum resultado corresponde à busca.");
      td.colSpan = headers.length;
      tr.append(td);
      tbody.append(tr);
      return;
    }

    orderedIndexes.forEach((index) => {
      const tr = document.createElement("tr");
      rows[index].forEach((value) => {
        const td = document.createElement("td");
        if (value instanceof Node) td.append(value);
        else td.textContent = value == null || value === "" ? "—" : String(value);
        tr.append(td);
      });
      tbody.append(tr);
    });
  };

  headers.forEach((header, index) => {
    const th = document.createElement("th");
    if (!options.sortable) {
      th.textContent = header;
      headerRow.append(th);
      return;
    }

    const button = element("button", "table-sort-button");
    if (header.badge) {
      button.append(element("span", `result-badge ${header.badge}`, header.label));
    } else {
      button.append(element("span", "", header.label));
    }
    const indicator = element("span", "sort-indicator", index === 0 ? "↑" : "↕");
    indicator.setAttribute("aria-hidden", "true");
    button.append(indicator);
    button.type = "button";
    button.dataset.label = header.label;
    button.setAttribute(
      "aria-label",
      `Ordenar por ${header.label} em ordem crescente`,
    );

    if (index === 0) th.setAttribute("aria-sort", "ascending");
    button.addEventListener("click", () => {
      if (sortColumn === index) sortDirection *= -1;
      else {
        sortColumn = index;
        sortDirection = 1;
      }

      headerRow.querySelectorAll("th").forEach((cell) => {
        cell.removeAttribute("aria-sort");
        const sortButton = cell.querySelector(".table-sort-button");
        if (!sortButton) return;
        sortButton.setAttribute(
          "aria-label",
          `Ordenar por ${sortButton.dataset.label} em ordem crescente`,
        );
        sortButton.querySelector(".sort-indicator").textContent = "↕";
      });
      th.setAttribute("aria-sort", sortDirection === 1 ? "ascending" : "descending");
      button.setAttribute(
        "aria-label",
        `Ordenar por ${header.label} em ordem ${sortDirection === 1 ? "crescente" : "decrescente"}`,
      );
      indicator.textContent = sortDirection === 1 ? "↑" : "↓";
      renderRows();
    });
    th.append(button);
    headerRow.append(th);
  });

  thead.append(headerRow);
  if (options.searchInput) $(options.searchInput).oninput = renderRows;
  renderRows();
  tableElement.append(thead, tbody);
  return tableElement;
}

export function resultBadge(result) {
  const value = String(result || "INDETERMINATE").toUpperCase();
  const kind = value === "FAIL" ? "fail" : value === "PASS" ? "pass" : "indeterminate";
  const label = value === "FAIL" ? "Não aderente" : value === "PASS" ? "Aderente" : "Indeterminada";
  return element("span", `result-badge ${kind}`, label);
}
