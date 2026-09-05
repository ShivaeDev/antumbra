import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Effect } from "effect";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { admitNode } from "#tree/lifecycle/admit-node.ts";
import { closeNode } from "#tree/lifecycle/close-node.ts";
import { openNode } from "#tree/lifecycle/open-node.ts";
import { recordOn } from "#tree/lifecycle/record-on.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

export const SessionTreeLifecycle = defineService({
	id: "@antumbra/sessions/SessionTreeLifecycle",
	initialize: Effect.void,
	methods: () => ({ admitNode, closeNode, openNode, recordOn }),
	requires: [Database, SessionEventJournal, SessionTreeLedger, SessionTreeRows],
});
