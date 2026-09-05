import { Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { hailCaptain } from "#hail.ts";
import { KernelReach } from "#kernel-reach.ts";
import { workPieceNow } from "#piece-work/work.ts";
import { readVoyageView } from "#voyage-read.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";
import { list } from "#voyages/list.ts";

export const VoyageProcedureService = defineService({
	id: "@antumbra/domain/VoyageProcedures",
	requires: [Boards, Database, KernelReach, Pieces, Rulings, VoyageWorldSource],
	initialize: Effect.void,
	methods: () => ({
		hail: hailCaptain,
		list,
		read: readVoyageView,
		workNow: workPieceNow,
	}),
});
export type VoyageProcedures = Context.Service.Shape<typeof VoyageProcedureService>;
