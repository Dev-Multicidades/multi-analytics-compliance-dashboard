import { $, apiUnavailableState, element } from "../../shared/dom.js?v=2";
import { formatMonth, formatNumber, formatPercent } from "../../shared/format.js?v=20";
const MAX_CLIENTS_WITHOUT_PAGINATION = 2;

function renderMonthGroup(month, monthIndex) {
  const monthGroup = element(
    "section",
    `client-month-group ${monthIndex % 2 === 0 ? "client-month-group--gray" : "client-month-group--white"}`,
  );
  monthGroup.append(element("h3", "client-month-title", formatMonth(month.mes)));
  const rows = element("div", "client-month-rows");
  [...(month.cliente || [])]
    .sort((a, b) => (Number(b.aderencia_percentual) || 0) - (Number(a.aderencia_percentual) || 0))
    .forEach((client) => {
      const value = Math.max(0, Math.min(100, Number(client.aderencia_percentual) || 0));
      const row = element("div", "client-row");
      const heading = element("div", "client-heading");
      heading.append(element("span", "client-name", client.nome));
      const track = element("div", "client-track");
      const fill = document.createElement("span");
      fill.style.width = `${value}%`;
      track.append(fill);
      const progress = element("div", "client-progress");
      progress.append(track, element("span", "client-value", formatPercent(value)));
      if (client.total !== null && client.total !== undefined && client.total !== "") {
        progress.append(
          element("span", "client-total", `${formatNumber(client.total)} reservas`),
        );
      }
      row.append(heading, progress);
      rows.append(row);
    });
  monthGroup.append(rows);
  return monthGroup;
}

export function renderClient(clientData) {
  const container = $("#client-breakdown");
  container.replaceChildren();
  const months = clientData?.periodo || [];
  if (!months.length) {
    container.append(apiUnavailableState());
    return;
  }

  const chart = element("div", "client-chart");
  const pages = [];
  let shortMonthPage = [];
  months.forEach((month, monthIndex) => {
    if ((month.cliente || []).length <= MAX_CLIENTS_WITHOUT_PAGINATION) {
      shortMonthPage.push({ month, monthIndex });
      return;
    }

    if (shortMonthPage.length) {
      pages.push(shortMonthPage);
      shortMonthPage = [];
    }
    pages.push([{ month, monthIndex }]);
  });
  if (shortMonthPage.length) pages.push(shortMonthPage);

  if (pages.length === 1) {
    pages[0].forEach(({ month, monthIndex }) => {
      chart.append(renderMonthGroup(month, monthIndex));
    });
    container.append(chart);
    return;
  }

  let currentPageIndex = 0;
  const pagination = element("nav", "client-pagination");
  pagination.setAttribute("aria-label", "Paginação da adesão por empresa");
  const previousButton = element("button", "client-pagination-button", "Período anterior");
  previousButton.type = "button";
  const pageLabel = element("span", "client-pagination-label");
  pageLabel.setAttribute("aria-live", "polite");
  const nextButton = element("button", "client-pagination-button", "Próximo período");
  nextButton.type = "button";

  const renderPage = () => {
    const pageMonths = pages[currentPageIndex];
    const firstMonth = formatMonth(pageMonths[0].month.mes);
    const lastMonth = formatMonth(pageMonths[pageMonths.length - 1].month.mes);
    const period = firstMonth === lastMonth ? firstMonth : `${firstMonth} — ${lastMonth}`;
    pageLabel.textContent = `${period} (${currentPageIndex + 1} de ${pages.length})`;
    previousButton.disabled = currentPageIndex === 0;
    nextButton.disabled = currentPageIndex === pages.length - 1;
    chart.replaceChildren(...pageMonths.map(({ month, monthIndex }) => renderMonthGroup(month, monthIndex)));
  };

  previousButton.addEventListener("click", () => {
    if (currentPageIndex > 0) {
      currentPageIndex -= 1;
      renderPage();
    }
  });
  nextButton.addEventListener("click", () => {
    if (currentPageIndex < pages.length - 1) {
      currentPageIndex += 1;
      renderPage();
    }
  });

  pagination.append(previousButton, pageLabel, nextButton);
  renderPage();
  container.append(pagination, chart);
}
