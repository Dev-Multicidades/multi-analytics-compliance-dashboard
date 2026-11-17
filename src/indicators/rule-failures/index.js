import { $, element, emptyState } from "../../shared/dom.js";
import { formatMonth, formatNumber } from "../../shared/format.js?v=20";

const SVG_NS = "http://www.w3.org/2000/svg";
const SERIES_COLORS = [
  "#3a69f9",
  "#2da87a",
  "#df6e73",
  "#e9ae4b",
  "#8b63c7",
  "#298fa3",
  "#d1783a",
  "#617b55",
];
let chartResizeObserver;

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function monthKeyFromDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

function monthsInRange(startDate, endDate) {
  const start = monthKeyFromDate(startDate);
  const end = monthKeyFromDate(endDate);
  if (!start || !end || start > end) return [];

  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const months = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.push({
      key,
      label: formatMonth(`${String(month).padStart(2, "0")}/${year}`),
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function countReservationsByFailedRuleTypeAndMonth(reservations, months) {
  const monthKeys = new Set(months.map(({ key }) => key));
  const reservationIdsByRuleType = new Map();

  reservations.forEach((reservation, index) => {
    if (String(reservation?.result ?? "").trim().toUpperCase() !== "FAIL") return;
    const monthKey = monthKeyFromDate(reservation.dtemissao);
    if (!monthKey || !monthKeys.has(monthKey)) return;

    const reservationId = reservation.numero_reserva == null
      ? `registro-${index}`
      : String(reservation.numero_reserva);
    const failedRuleTypes = new Set(
      (Array.isArray(reservation.rules) ? reservation.rules : [])
        .filter((rule) => String(rule?.result ?? "").trim().toUpperCase() === "FAIL")
        .map((rule) => String(rule?.rule_type ?? "").trim())
        .filter(Boolean),
    );

    if (!failedRuleTypes.size) failedRuleTypes.add("Tipo de regra não informado");

    failedRuleTypes.forEach((ruleType) => {
      if (!reservationIdsByRuleType.has(ruleType)) {
        reservationIdsByRuleType.set(ruleType, new Map());
      }
      const reservationsByMonth = reservationIdsByRuleType.get(ruleType);
      if (!reservationsByMonth.has(monthKey)) reservationsByMonth.set(monthKey, new Set());
      reservationsByMonth.get(monthKey).add(reservationId);
    });
  });

  return [...reservationIdsByRuleType.entries()]
    .map(([ruleType, reservationsByMonth]) => {
      const counts = months.map(({ key }) => reservationsByMonth.get(key)?.size || 0);
      return {
        ruleType,
        counts,
        total: counts.reduce((sum, count) => sum + count, 0),
      };
    })
    .filter((series) => series.total > 0)
    .sort((left, right) =>
      right.total - left.total || left.ruleType.localeCompare(right.ruleType, "pt-BR"),
    );
}

function renderChart(chart, months, series) {
  let renderedWidth = 0;
  let renderedHeight = 0;

  const draw = () => {
    const labelWidth = Math.max(130, ...series.map(({ ruleType }) => ruleType.length * 9 + 20));
    const width = Math.max(
      chart.clientWidth,
      months.length * 78 + 42 + labelWidth + 24,
      420,
    );
    const height = Math.max(282, series.length * 18 + 90);
    if (width === renderedWidth && height === renderedHeight) return;
    renderedWidth = width;
    renderedHeight = height;

    const left = 42;
    const right = width - labelWidth;
    const top = 28;
    const bottom = height - 62;
    const maxCount = Math.max(1, ...series.flatMap(({ counts }) => counts));
    const x = (index) => months.length === 1
      ? (left + right) / 2
      : left + index * (right - left) / (months.length - 1);
    const y = (count) => bottom - (count / maxCount) * (bottom - top);
    const svg = svgElement("svg", {
      class: "rule-failures-svg",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Contagem mensal de reservas não aderentes por tipo de regra",
      style: `height: ${height}px`,
    });

    const ticks = [...new Set([0, Math.ceil(maxCount / 2), maxCount])];
    ticks.forEach((count) => {
      const lineY = y(count);
      svg.append(svgElement("line", {
        class: "rule-failures-gridline",
        x1: left,
        x2: right,
        y1: lineY,
        y2: lineY,
      }));
      const label = svgElement("text", {
        class: "rule-failures-axis-label",
        x: left - 8,
        y: lineY + 4,
        "text-anchor": "end",
      });
      label.textContent = formatNumber(count);
      svg.append(label);
    });

    months.forEach((month, index) => {
      const label = svgElement("text", {
        class: "rule-failures-month-label",
        x: x(index),
        y: bottom + 28,
        "text-anchor": "middle",
      });
      label.textContent = month.label;
      svg.append(label);
    });

    const directLabels = [];
    series.forEach((ruleSeries, seriesIndex) => {
      const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
      const coordinates = ruleSeries.counts
        .map((count, index) => `${x(index)},${y(count)}`)
        .join(" ");

      if (months.length > 1) {
        svg.append(svgElement("polyline", {
          class: "rule-failures-series-line",
          stroke: color,
          points: coordinates,
        }));
      }

      ruleSeries.counts.forEach((count, index) => {
        const pointX = x(index);
        const pointY = y(count);
        const point = svgElement("circle", {
          class: "rule-failures-point",
          cx: pointX,
          cy: pointY,
          r: 4,
          stroke: color,
        });
        const title = svgElement("title");
        title.textContent = `${ruleSeries.ruleType} · ${months[index].label}: ${formatNumber(count)} ${count === 1 ? "reserva" : "reservas"}`;
        point.append(title);
        svg.append(point);

        if (count > 0) {
          const labelOffset = (seriesIndex % 4) * 16;
          const labelY = pointY <= top + 24
            ? pointY + 14 + labelOffset
            : pointY - 11 - labelOffset;
          const value = svgElement("text", {
            class: "rule-failures-value-label",
            x: pointX,
            y: labelY,
            "text-anchor": "middle",
          });
          value.textContent = formatNumber(count);
          svg.append(value);
        }
      });

      directLabels.push({
        ruleType: ruleSeries.ruleType,
        color,
        targetY: y(ruleSeries.counts[ruleSeries.counts.length - 1]),
      });
    });

    directLabels.sort((leftLabel, rightLabel) => leftLabel.targetY - rightLabel.targetY);
    const minLabelY = top + 12;
    const maxLabelY = bottom - 4;
    const labelGap = 18;
    const labelPositions = [];
    directLabels.forEach((label, index) => {
      const targetY = Math.max(minLabelY, Math.min(maxLabelY, label.targetY));
      labelPositions.push(
        index === 0 ? targetY : Math.max(targetY, labelPositions[index - 1] + labelGap),
      );
    });

    if (labelPositions.length && labelPositions[labelPositions.length - 1] > maxLabelY) {
      labelPositions[labelPositions.length - 1] = maxLabelY;
      for (let index = labelPositions.length - 2; index >= 0; index -= 1) {
        labelPositions[index] = Math.min(
          labelPositions[index],
          labelPositions[index + 1] - labelGap,
        );
      }
    }

    directLabels.forEach(({ ruleType, color }, index) => {
      const label = svgElement("text", {
        class: "rule-failures-series-label",
        x: right + 10,
        y: labelPositions[index] + 4,
        fill: color,
      });
      label.textContent = ruleType;
      svg.append(label);
    });

    chart.replaceChildren(svg);
  };

  draw();
  chartResizeObserver = new ResizeObserver(draw);
  chartResizeObserver.observe(chart);
}

export function renderRuleFailures(reservations, filters) {
  chartResizeObserver?.disconnect();
  const container = $("#rule-failure-breakdown");
  if (!Array.isArray(reservations)) {
    container.replaceChildren(
      emptyState("A API retornou um formato inesperado para a lista de reservas e regras."),
    );
    return;
  }

  const months = monthsInRange(filters?.data_inicio, filters?.data_fim);
  if (!months.length) {
    container.replaceChildren(emptyState("Informe um período válido para exibir as contagens mensais."));
    return;
  }

  const series = countReservationsByFailedRuleTypeAndMonth(reservations, months);
  if (!series.length) {
    container.replaceChildren(
      emptyState("Nenhuma reserva não aderente encontrada para este período."),
    );
    return;
  }

  const chart = element("div", "rule-failures-chart");
  container.replaceChildren(chart);
  renderChart(chart, months, series);
}
