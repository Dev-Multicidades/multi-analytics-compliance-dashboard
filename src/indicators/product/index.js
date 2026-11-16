import { $, element, emptyState } from "../../shared/dom.js";
import { formatMonth, formatNumber, formatPercent, productLabel } from "../../shared/format.js?v=20";

function monthTotal(month) {
  return ["nacional", "internacional"].reduce((total, region) => {
    const products = month[region]?.produto || {};
    return total + Object.values(products).reduce(
      (sum, product) => sum + (Number(product.total) || 0),
      0,
    );
  }, 0);
}

function productIcon(product) {
  const paths = {
    aereo: "M12 2 10.5 10 3 14v2l7.5-2v5l-2 1.5V22l3.5-1 3.5 1v-1.5L13.5 19v-5l7.5 2v-2L13 10 12 2Z",
    hospedagem: "M3 18V6M3 14h18v4M3 10h4a3 3 0 0 1 3 3v1M10 14v-2a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v2M21 18v-4",
    locacao_veiculos: "M5 17h14l1.5-5-2-5h-13l-2 5L5 17ZM4 12h16M7 17v2M17 17v2M7 12l1-3h8l1 3",
  }[product];
  if (!paths) return null;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "product-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", paths);
  svg.append(path);
  return svg;
}

export function renderProduct(productData) {
  const container = $("#product-breakdown");
  container.replaceChildren();
  const months = productData?.periodo || [];
  if (!months.length) {
    container.append(emptyState("Nenhum dado de produto encontrado para este período."));
    return;
  }

  months.forEach((month) => {
    const section = element("div", "product-month");
    const heading = element("div", "month-heading");
    heading.append(
      element("strong", "", formatMonth(month.mes)),
      element("span", "month-total", `Total do mês: ${formatNumber(monthTotal(month))} reservas`),
    );
    section.append(heading);

    const regions = element("div", "product-regions");
    ["nacional", "internacional"].forEach((region) => {
      const entries = Object.entries(month[region]?.produto || {});
      const regionPanel = element("div", "product-region");
      regionPanel.append(element("span", "region-label", region === "nacional" ? "Nacional" : "Internacional"));
      if (!entries.length) {
        regionPanel.append(element("span", "region-empty", "Sem dados"));
        regions.append(regionPanel);
        return;
      }

      const bars = element("div", "product-bars");
      entries.forEach(([name, metrics]) => {
        const item = element("div", "product-item");
        const meta = element("div", "product-meta");
        const productName = element("span", "product-name");
        const icon = productIcon(name);
        if (icon) productName.append(icon);
        productName.append(element("span", "product-name-label", productLabel(name)));
        meta.append(
          productName,
          element("span", "product-percent", formatPercent(metrics.aderencia_percentual)),
        );
        const bar = element("div", "stack-bar");
        bar.setAttribute("aria-label", `${productLabel(name)}: ${formatPercent(metrics.aderencia_percentual)} de aderência`);
        const total = Number(metrics.total) || 0;
        [
          ["adherent", metrics.aderente],
          ["non-adherent", metrics.nao_aderente],
          ["unknown", metrics.indeterminate],
        ].forEach(([className, count]) => {
          const value = Number(count) || 0;
          if (!total || !value) return;
          const segment = document.createElement("span");
          segment.className = className;
          segment.style.width = `${Math.max(0, (value / total) * 100)}%`;
          bar.append(segment);
        });
        item.append(meta, bar, element("div", "product-caption", `${formatNumber(total)} reservas`));
        bars.append(item);
      });
      regionPanel.append(bars);
      regions.append(regionPanel);
    });
    section.append(regions);
    container.append(section);
  });
}

export function renderProductError(message) {
  const container = $("#product-breakdown");
  container.replaceChildren(emptyState(message));
}
