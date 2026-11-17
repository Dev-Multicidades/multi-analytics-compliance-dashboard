import { $, apiUnavailableState, element } from "../../shared/dom.js?v=2";
import { formatMonth, formatNumber, formatPercent } from "../../shared/format.js?v=20";

const SVG_NS = "http://www.w3.org/2000/svg";
let chartResizeObserver;
let chartResizeHandler;

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function monthlyAdherence(month) {
  const clients = month.cliente || [];
  let totalReservations = 0;
  let adherentReservations = 0;

  clients.forEach((client) => {
    const total = Number(client.total);
    const percentage = Number(client.aderencia_percentual);
    if (!Number.isFinite(total) || total < 0 || !Number.isFinite(percentage)) return;
    totalReservations += total;
    adherentReservations += total * Math.max(0, Math.min(100, percentage)) / 100;
  });

  if (!totalReservations) return null;
  return {
    month: month.mes,
    totalReservations,
    percentage: (adherentReservations / totalReservations) * 100,
  };
}

export function renderMonthlyAdherence(clientData) {
  chartResizeObserver?.disconnect();
  if (chartResizeHandler) window.removeEventListener("resize", chartResizeHandler);
  const container = $("#monthly-adherence-chart");
  container.replaceChildren();

  const points = (clientData?.periodo || [])
    .map(monthlyAdherence)
    .filter((point) => point !== null);
  if (!points.length) {
    container.append(apiUnavailableState());
    return;
  }

  let renderedWidth = 0;
  const renderChart = () => {
    const styles = getComputedStyle(container);
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const width = Math.max(360, container.clientWidth - horizontalPadding);
    if (width === renderedWidth) return;
    renderedWidth = width;

    const height = 282;
    const left = 48;
    const right = width - 48;
    const top = 42;
    const bottom = 194;
    const x = (index) => points.length === 1
      ? (left + right) / 2
      : left + (index * (right - left)) / (points.length - 1);
    const y = (percentage) => bottom - (percentage / 100) * (bottom - top);

    const svg = svgElement("svg", {
      class: "monthly-adherence-svg",
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Evolução mensal da adesão, ponderada pelo total de reservas dos clientes",
    });

    const definitions = svgElement("defs");
    const gradient = svgElement("linearGradient", {
      id: "monthly-adherence-area-gradient",
      x1: "0",
      x2: "0",
      y1: "0",
      y2: "1",
    });
    gradient.append(
      svgElement("stop", { offset: "0%", "stop-color": "#3a69f9", "stop-opacity": ".18" }),
      svgElement("stop", { offset: "100%", "stop-color": "#3a69f9", "stop-opacity": ".01" }),
    );
    definitions.append(gradient);
    svg.append(definitions);

    [25, 50, 75].forEach((percentage) => {
      const gridline = svgElement("line", {
        class: "monthly-adherence-gridline",
        x1: left,
        x2: right,
        y1: y(percentage),
        y2: y(percentage),
      });
      svg.append(gridline);
    });

    for (let index = 0; index < points.length - 1; index += 1) {
      const separatorX = (x(index) + x(index + 1)) / 2;
      svg.append(svgElement("line", {
        class: "monthly-adherence-separator",
        x1: separatorX,
        x2: separatorX,
        y1: top,
        y2: bottom + 8,
      }));
    }

    const area = svgElement("polygon", {
      class: "monthly-adherence-area",
      points: [
        `${x(0)},${bottom}`,
        ...points.map((point, index) => `${x(index)},${y(point.percentage)}`),
        `${x(points.length - 1)},${bottom}`,
      ].join(" "),
    });
    svg.append(area);
    svg.append(svgElement("line", {
      class: "monthly-adherence-baseline",
      x1: left,
      x2: right,
      y1: bottom,
      y2: bottom,
    }));

    const line = svgElement("polyline", {
      class: "monthly-adherence-line",
      points: points.map((point, index) => `${x(index)},${y(point.percentage)}`).join(" "),
    });
    svg.append(line);

    points.forEach((point, index) => {
      const pointX = x(index);
      const pointY = y(point.percentage);
      const circle = svgElement("circle", {
        class: "monthly-adherence-point",
        cx: pointX,
        cy: pointY,
        r: 4.5,
      });
      const title = svgElement("title");
      title.textContent = `${formatMonth(point.month)}: ${formatPercent(point.percentage)} de adesão · ${formatNumber(point.totalReservations)} reservas`;
      circle.append(title);
      svg.append(circle);

      const value = svgElement("text", {
        class: "monthly-point-value",
        x: pointX,
        y: Math.max(top + 15, pointY - 14),
        "text-anchor": "middle",
      });
      value.textContent = formatPercent(point.percentage);
      svg.append(value);

      const monthLabel = svgElement("text", {
        class: "monthly-month-label",
        x: pointX,
        y: bottom + 27,
        "text-anchor": "middle",
      });
      monthLabel.textContent = formatMonth(point.month);
      svg.append(monthLabel);

      const reservationsLabel = svgElement("text", {
        class: "monthly-reservations-label",
        x: pointX,
        y: bottom + 49,
        "text-anchor": "middle",
      });
      reservationsLabel.textContent = `${formatNumber(point.totalReservations)} reservas`;
      svg.append(reservationsLabel);
    });

    container.replaceChildren(svg);
  };

  renderChart();
  chartResizeHandler = renderChart;
  window.addEventListener("resize", chartResizeHandler);
  chartResizeObserver = new ResizeObserver(renderChart);
  chartResizeObserver.observe(container);
}
