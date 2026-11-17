import { loadReservationRules } from "../api/compliance.js?v=26";
import { $, apiUnavailableState, element } from "../shared/dom.js?v=2";
import { resultBadge } from "../shared/table.js";

let activeRequest;
const dialog = $("#reservation-detail-dialog");

dialog.addEventListener("close", () => {
  activeRequest?.abort();
  activeRequest = undefined;
});

function displayValue(value) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatEmissionDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : displayValue(value);
}

function summaryField(label, value) {
  const field = element("div", "rule-summary-field");
  field.append(element("span", "rule-summary-label", label));
  field.append(element("strong", "", displayValue(value)));
  return field;
}

function renderOverallResult(value) {
  const card = $("#rule-reservation-result");
  const badge = resultBadge(value);
  card.classList.remove("pass", "fail", "indeterminate");
  if (badge.classList.contains("pass")) card.classList.add("pass");
  else if (badge.classList.contains("fail")) card.classList.add("fail");
  else card.classList.add("indeterminate");
  $("#rule-reservation-result-label").textContent = badge.textContent;
}

function ruleFact(label, value) {
  const fact = element("div", "rule-fact");
  fact.append(element("span", "rule-fact-label", label));
  fact.append(element("strong", "", displayValue(value)));
  return fact;
}

function renderRule(rule) {
  const card = element("article", "rule-reservation-card");
  const heading = element("div", "rule-reservation-card-heading");
  heading.append(element("h3", "", displayValue(rule.rule_id)));
  const badge = resultBadge(rule.result);
  heading.append(badge);
  card.append(heading);
  const resultKind = badge.classList.contains("pass")
    ? "pass"
    : badge.classList.contains("fail")
      ? "fail"
      : "indeterminate";
  const reason = element("div", `rule-reservation-reason ${resultKind}`);
  reason.append(
    element("span", "rule-reservation-reason-label", "Motivo da Regra"),
    element("p", "rule-reservation-reason-value", displayValue(rule.reason)),
  );
  card.append(reason);

  const facts = element("div", "rule-facts");
  facts.append(
    ruleFact("Tipo", rule.rule_type),
    ruleFact("Natureza", rule.nature),
    ruleFact("Valor encontrado", rule.actual_value),
    ruleFact("Limite aplicável", rule.expected_value),
  );
  card.append(facts);

  if (Array.isArray(rule.missing_fields) && rule.missing_fields.length) {
    const missingFields = element("div", "rule-missing-fields");
    missingFields.append(element("span", "rule-fact-label", "Campos ausentes"));
    const tags = element("div", "rule-missing-field-tags");
    rule.missing_fields.forEach((field) => {
      tags.append(element("span", "rule-missing-field", displayValue(field)));
    });
    missingFields.append(tags);
    card.append(missingFields);
  }

  return card;
}

function renderRules(data, numeroReserva) {
  const container = $("#rule-reservation-data");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    container.replaceChildren(element("pre", "rule-reservation-raw-data", JSON.stringify(data, null, 2)));
    return;
  }

  $("#rule-reservation-number").textContent = displayValue(data.numero_reserva ?? numeroReserva);
  $("#rule-reservation-client").textContent = displayValue(data.cliente);
  renderOverallResult(data.result);

  const summary = element("div", "rule-reservation-summary");
  summary.append(
    summaryField("Data de emissão", formatEmissionDate(data.dtemissao)),
    summaryField("Categoria", data.categoria),
    summaryField("Centro de Custo", data.centro_custo_id),
    summaryField("Autorizador", data.autorizador),
    summaryField("Passageiro", data.pax),
  );

  const rules = Array.isArray(data.rules) ? data.rules : [];
  const sortedRules = [...rules].sort((left, right) =>
    String(left?.nature ?? "").localeCompare(String(right?.nature ?? ""), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }));
  const ruleList = element("div", "rule-reservation-list");
  if (sortedRules.length) sortedRules.forEach((rule) => ruleList.append(renderRule(rule || {})));
  else ruleList.append(apiUnavailableState());

  container.replaceChildren(summary, ruleList);
}

export async function renderReservationRules({ numeroReserva, filters }) {
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  if (!dialog.open) dialog.showModal();
  $("#rule-reservation-number").textContent = numeroReserva || "Não informado";
  $("#rule-reservation-client").textContent = "—";
  $("#rule-reservation-result").classList.remove("pass", "fail", "indeterminate");
  $("#rule-reservation-result-label").textContent = "—";
  $("#rule-reservation-error").hidden = true;
  $("#rule-reservation-data").replaceChildren(element("div", "empty-state", "Aguardando dados da API…"));
  $("#rule-reservation-loader").hidden = false;

  try {
    const data = await loadReservationRules(filters, controller.signal, $("#api-token").value.trim());
    if (controller.signal.aborted) return;
    renderRules(data, numeroReserva);
  } catch (error) {
    if (error.name === "AbortError") return;
    $("#rule-reservation-error").textContent = `Não foi possível carregar as regras desta reserva: ${error.message}`;
    $("#rule-reservation-error").hidden = false;
    $("#rule-reservation-data").replaceChildren(apiUnavailableState());
  } finally {
    if (activeRequest === controller) {
      $("#rule-reservation-loader").hidden = true;
      activeRequest = undefined;
    }
  }
}

export function hideReservationRules() {
  activeRequest?.abort();
  activeRequest = undefined;
  if (dialog.open) dialog.close();
}
