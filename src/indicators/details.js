import { renderApprovers } from "./approvers/index.js?v=22";
import { renderCostCenters } from "./cost-centers/index.js?v=22";
import { renderPassengers } from "./passengers/index.js?v=22";
import { renderReservations } from "./reservations/index.js?v=32";

export function renderDetails(data) {
  return {
    passengers: renderPassengers(data.passenger),
    reservations: renderReservations(data.passenger),
    approvers: renderApprovers(data.approver),
    costCenters: renderCostCenters(data.costCenter),
  };
}
