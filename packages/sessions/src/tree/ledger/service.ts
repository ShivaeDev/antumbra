import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { awaitingAudit } from "#tree/ledger/awaiting-audit.ts";
import { gapKinds } from "#tree/ledger/gap-kinds.ts";
import { nodeById } from "#tree/ledger/node-by-id.ts";
import { nodeRow } from "#tree/ledger/node-row.ts";
import { nodeRows } from "#tree/ledger/node-rows.ts";
import { openNodes } from "#tree/ledger/open-nodes.ts";
import { recorded } from "#tree/ledger/recorded.ts";
import { settle } from "#tree/ledger/settle.ts";

export const SessionTreeLedger = defineService({
	id: "@antumbra/sessions/SessionTreeLedger",
	initialize: Effect.void,
	methods: () => ({ gapKinds, recorded, nodeRows, nodeRow, nodeById, awaitingAudit, openNodes, settle }),
	requires: [Database],
});
