import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { land } from "#commands/land.ts";
import { initialize } from "#initialize.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { forVoyage } from "#queries/for-voyage.ts";
export const Reports = defineService({
	id: "@antumbra/server-reports/Reports",
	requires: [ReportsHistory],
	initialize: initialize,
	methods: (serial) => ({ land: land(serial), byId, byPiece, forVoyage }),
});
