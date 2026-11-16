import { loadComplianceDashboard } from "../api/compliance.js?v=23";
import { $ } from "../shared/dom.js";
import { clearCsvExports, downloadCsv, setCsvExport } from "../shared/csv.js";
import { renderDetails } from "../indicators/details.js?v=30";
import { hideReservationRules, renderReservationRules } from "./reservation-rules.js?v=33";
import { renderClient } from "../indicators/client/index.js?v=20";
import { renderMonthlyAdherence } from "../indicators/client/monthly.js?v=20";
import { renderProduct, renderProductError } from "../indicators/product/index.js?v=20";
import { renderSummary } from "../indicators/summary/index.js?v=20";

let activeRequest;

const CLIENT_ABBREVIATIONS = new Set(["abpf", "agis", "chep"]);

function formatClientName(slug) {
  return slug
    .split("-")
    .map((word) => (
      CLIENT_ABBREVIATIONS.has(word.toLowerCase())
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
    ))
    .join(" ");
}

function updateSectionLoader(section, state, message) {
  const loader = $(`#section-loader-${section}`);
  loader.hidden = state === "idle";
  loader.classList.toggle("section-loader--error", state === "error");
  loader.querySelector(".section-loader-spinner").hidden = state !== "loading";
  loader.querySelector(".section-loader-label").textContent = message;
}

function updateConnection(connected, message) {
  const indicator = $("#connection-indicator");
  indicator.classList.toggle("connected", connected);
  indicator.classList.toggle("disconnected", !connected);
  $("#connection-label").textContent = message;
}

function renderError(message) {
  const error = $("#page-error");
  error.textContent = message;
  error.hidden = false;
}

function exportFilename(label) {
  const client = $("#client-slug").value.trim().replace(/[^a-z0-9_-]/gi, "-") || "cliente";
  return `${label}-${client}-${$("#start-date").value}-${$("#end-date").value}.csv`;
}

async function refreshDashboard(event) {
  event?.preventDefault();
  const clientSlug = $("#client-slug").value.trim();
  const startDate = $("#start-date").value;
  const endDate = $("#end-date").value;
  const token = $("#api-token").value.trim();
  const error = $("#page-error");
  error.hidden = true;

  if (!clientSlug || !startDate || !endDate || startDate > endDate) {
    renderError("Informe o cliente e um intervalo de datas válido (a data inicial deve ser anterior à final).");
    return;
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  clearCsvExports();
  const filters = {
    cliente_slug: clientSlug,
    data_inicio: startDate,
    data_fim: endDate,
  };
  const button = $("#apply-filters");
  button.disabled = true;
  $("#loading-bar").hidden = false;
  const sectionMessages = {
    summary: "Carregando indicadores principais…",
    monthly: "Carregando evolução mensal da adesão…",
    product: "Carregando adesão por produto…",
    client: "Carregando adesão por cliente…",
    details: "Carregando reservas para acompanhamento…",
  };
  Object.entries(sectionMessages).forEach(([section, message]) => {
    updateSectionLoader(section, "loading", message);
  });
  updateConnection(false, "Consultando APIs…");
  $("#period-label").textContent = `${startDate} — ${endDate}`;

  try {
    const promises = loadComplianceDashboard(filters, controller.signal, token);
    const names = Object.keys(promises);
    async function loadSection(sectionNames, sections, onSuccess) {
      const sectionResults = await Promise.allSettled(sectionNames.map((name) => promises[name]));
      if (controller.signal.aborted) return;

      const sectionData = {};
      let failed = false;
      sectionResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          sectionData[sectionNames[index]] = result.value;
        } else {
          failed = true;
        }
      });

      if (Object.keys(sectionData).length) onSuccess(sectionData);
      sections.forEach((section) => {
        if (failed) {
          updateSectionLoader(section, "error", "Não foi possível carregar esta seção. Consulte o aviso no início do painel.");
        } else {
          updateSectionLoader(section, "idle", "");
        }
      });
    }

    const sectionJobs = [
      loadSection(["summary"], ["summary"], (data) => renderSummary(data.summary)),
      loadSection(["product"], ["product"], (data) => renderProduct(data.product)),
      loadSection(["client"], ["monthly", "client"], (data) => {
        renderClient(data.client);
        renderMonthlyAdherence(data.client);
      }),
      loadSection(["passenger", "approver", "costCenter"], ["details"], (data) => {
        const details = renderDetails(data);
        if (data.passenger) setCsvExport("passengers", "#export-passengers", details.passengers.headers, details.passengers.rows);
        if (data.approver) setCsvExport("approvers", "#export-approvers", details.approvers.headers, details.approvers.rows);
        if (data.costCenter) setCsvExport("cost-centers", "#export-cost-centers", details.costCenters.headers, details.costCenters.rows);
      }),
    ];
    const results = await Promise.allSettled(Object.values(promises));
    await Promise.all(sectionJobs);
    if (controller.signal.aborted) return;

    const data = {};
    const failures = [];
    let productFailure;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") data[names[index]] = result.value;
      else {
        const reason = result.reason?.message || "falha na consulta";
        failures.push(`${names[index]}: ${reason}`);
        if (names[index] === "product") productFailure = reason;
      }
    });

    if (productFailure) {
      const authHint = productFailure.includes("HTTP 401")
        ? " Verifique se o token Bearer foi informado e está válido."
        : "";
      renderProductError(`Não foi possível carregar o indicador. ${productFailure}.${authHint}`);
    }
    if (failures.length) {
      const authHint = failures.some((failure) => failure.includes("HTTP 401"))
        ? " Confira se o token Bearer está preenchido e válido."
        : "";
      const connectionHint = failures.some((failure) => failure.includes("Failed to fetch"))
        ? " Confira se a API está em execução e acessível pelo servidor local."
        : "";
      renderError(`Não foi possível carregar todos os dados. ${failures.join(" | ")}${authHint}${connectionHint}`);
      updateConnection(false, "API parcialmente indisponível");
    } else {
      updateConnection(true, "API conectada");
    }
  } catch (requestError) {
    if (requestError.name !== "AbortError" && !controller.signal.aborted) {
      renderError(`Falha ao consultar as APIs: ${requestError.message}. Verifique se o servidor está disponível em http://127.0.0.1:8000.`);
      updateConnection(false, "API indisponível");
    }
  } finally {
    if (activeRequest === controller && !controller.signal.aborted) {
      button.disabled = false;
      $("#loading-bar").hidden = true;
    }
  }
}

function bindCsvExports() {
  [
    ["#export-passengers", "passengers", "passageiros"],
    ["#export-approvers", "approvers", "autorizadores"],
    ["#export-cost-centers", "cost-centers", "centros-de-custo"],
  ].forEach(([selector, key, label]) => {
    $(selector).addEventListener("click", () => {
      downloadCsv(key, exportFilename(label));
    });
  });
}

export function initializeDashboard() {
  const routeMatch = window.location.pathname.match(
    /^\/compliance\/dashboard\/([a-z0-9-]+)\/?$/,
  );
  if (routeMatch) {
    const clientSlug = routeMatch[1];
    const clientName = formatClientName(clientSlug);
    document.documentElement.dataset.dashboardClient = clientSlug;
    $("#client-slug").value = clientSlug;
    $("#client-slug").readOnly = true;
    $("#client-slug").closest(".filter-field").hidden = true;
    $("#api-token").closest(".filter-field").hidden = true;
    $(".header-meta").hidden = true;
    $("#page-title").textContent += ` - ${clientName}`;
  }

  $("#filters").addEventListener("submit", refreshDashboard);
  $("#reservation-table").addEventListener("click", (event) => {
    const link = event.target.closest("[data-reservation-detail]");
    if (!link) return;
    event.preventDefault();
    const state = {
      view: "reservation-detail",
      numeroReserva: link.dataset.numeroReserva,
      filters: {
        cliente_slug: $("#client-slug").value.trim(),
        numero_reserva: link.dataset.numeroReserva,
      },
    };
    renderReservationRules(state);
  });
  $("#rule-reservation-back").addEventListener("click", hideReservationRules);
  $("#reservation-detail-dialog").addEventListener("click", (event) => {
    if (event.target === $("#reservation-detail-dialog")) hideReservationRules();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !$("#reservation-detail-dialog").open) return;
    event.preventDefault();
    hideReservationRules();
  });
  bindCsvExports();
  refreshDashboard();
}
