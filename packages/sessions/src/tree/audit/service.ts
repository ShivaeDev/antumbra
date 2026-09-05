import { defineService } from "@antumbra/service-definition";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Effect } from "effect";
import { audit } from "#tree/audit/audit.ts";
import { project } from "#tree/audit/project.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";

export const SessionTreeAudits = defineService({
	id: "@antumbra/sessions/SessionTreeAudits",
	initialize: Effect.void,
	methods: () => ({ audit, project }),
	requires: [SessionTreeLedger, SessionEventJournal],
});
