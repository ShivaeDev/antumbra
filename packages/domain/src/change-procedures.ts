import { defineService } from "@antumbra/service-definition";
import type { Context } from "effect";
import {
	capabilities,
	hostTags,
	quay,
	requestRefresh,
} from "#change-procedure-host-operations.ts";
import { changeProcedureRequirements } from "#change-procedure-requirements.ts";
import {
	adopt,
	observed,
	open,
	refresh,
	submit,
	watchableChanges,
} from "#change-procedure-submission-operations.ts";

export type { ChangeHostCapabilityView } from "#change-procedure-host-operations.ts";
export { ChangeHosts } from "#change-procedure-requirements.ts";

export const ChangeProcedureService = defineService({
	id: "@antumbra/domain/ChangeProcedures",
	requires: changeProcedureRequirements,
	operations: {
		adopt,
		capabilities,
		hostTags,
		observed,
		open,
		quay,
		refresh,
		requestRefresh,
		submit,
		watchableChanges,
	},
});

export type ChangeProcedures = Context.Service.Shape<
	typeof ChangeProcedureService
>;
