import { Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { RoleSettings } from "@antumbra/settings";
import { Voyages } from "@antumbra/voyages";
import { type Context, Effect } from "effect";
import { ExecutionSource } from "#execution/service.ts";
import { hailCaptain } from "#hail.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { workPieceNow } from "#piece-work/work.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";
import { readVoyageView } from "#voyage-read.ts";
import { charterWithNotice } from "#voyages/charter.ts";
import { list } from "#voyages/list.ts";
import { open } from "#voyages/open.ts";

export const VoyageProcedureService = defineService({
	id: "@antumbra/domain/VoyageProcedures",
	requires: [Boards, Database, ExecutionSource, KernelReach, Pieces, RoleSettings, Rulings, VoyageDetails, VoyageSummaries, Voyages],
	initialize: Effect.void,
	methods: () => ({
		charterWithNotice,
		hail: hailCaptain,
		list,
		open,
		read: readVoyageView,
		workNow: workPieceNow,
	}),
});
export type VoyageProcedures = Context.Service.Shape<typeof VoyageProcedureService>;
