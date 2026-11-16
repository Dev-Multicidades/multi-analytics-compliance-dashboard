export function flattenReservations(data, parentKey) {
  return (data?.payload || data?.passageiro || []).flatMap((group) =>
    (group.reservas || []).map((reservation) => ({
      group: group[parentKey] || "—",
      ...reservation,
    })),
  );
}

export function aggregateResults(records, dimensionsForRecord) {
  const groups = new Map();
  records.forEach((record) => {
    const dimensions = dimensionsForRecord(record);
    const key = JSON.stringify(dimensions);
    const counts = groups.get(key) || {
      dimensions,
      adherent: 0,
      nonAdherent: 0,
      indeterminate: 0,
    };
    const result = String(record.result || "").toUpperCase();
    if (result === "PASS") counts.adherent += 1;
    else if (result === "FAIL") counts.nonAdherent += 1;
    else counts.indeterminate += 1;
    groups.set(key, counts);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    adherence: group.adherent + group.nonAdherent === 0
      ? 0
      : (group.adherent / (group.adherent + group.nonAdherent)) * 100,
  }));
}
