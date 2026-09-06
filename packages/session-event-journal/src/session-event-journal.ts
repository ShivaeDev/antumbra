import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { read } from "#read.ts";
import { record } from "#record.ts";
import { recordTogether } from "#record-together.ts";
import { usage } from "#usage.ts";

export const SessionEventJournal = defineService({
	id: "@antumbra/session-event-journal/SessionEventJournal",
	initialize: Effect.void,
	methods: () => ({ read, record, recordTogether, usage }),
	requires: [Database, DomainFeeds],
});

export const SessionEventJournalLive = SessionEventJournal.layer;
