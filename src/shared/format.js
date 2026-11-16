const numberFormat = new Intl.NumberFormat("pt-BR");
const percentageFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

export function formatPercent(value) {
  return `${percentageFormat.format(Number(value) || 0)}%`;
}

export function formatDisplayName(value) {
  return String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator, letter) =>
      `${separator}${letter.toLocaleUpperCase("pt-BR")}`,
    );
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function formatMonth(month) {
  const [monthNumber, year] = String(month).split("/");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[Number(monthNumber) - 1] || monthNumber}/${year || ""}`;
}

export function productLabel(product) {
  return ({
    aereo: "Aéreo",
    hospedagem: "Hospedagem",
    locacao_veiculos: "Locação de veículos",
  })[product] || String(product).replaceAll("_", " ");
}
