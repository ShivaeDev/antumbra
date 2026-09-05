import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { SessionTreeAudits } from "#tree/audit/service.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";
import { create } from "#tree/sweeps/create.ts";

export const SessionTreeSweeps = defineService({
	id: "@antumbra/sessions/SessionTreeSweeps",
	initialize: Effect.void,
	methods: () => ({ create }),
	requires: [SessionTreeAudits, SessionTreeLedger, SessionTreeRows],
});
