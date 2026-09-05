import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Effect } from "effect";
import { reconcile } from "#tree/reconcile/reconcile.ts";

export const SessionNodeReconciler = defineService({
	id: "@antumbra/sessions/SessionNodeReconciler",
	initialize: Effect.void,
	methods: () => ({ reconcile }),
	requires: [Database, SessionEventJournal],
});
