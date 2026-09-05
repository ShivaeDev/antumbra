import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Effect } from "effect";
import { SessionTreeAudits } from "#tree/audit/service.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { reconcile } from "#tree/reconcile/reconcile.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

export const SessionNodeReconciler = defineService({
	id: "@antumbra/sessions/SessionNodeReconciler",
	initialize: Effect.void,
	methods: () => ({ reconcile }),
	requires: [Database, SessionEventJournal, SessionTreeAudits, SessionTreeLedger, SessionTreeRows],
});
