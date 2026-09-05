import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { read } from "#read.ts";
import { record } from "#record.ts";
import { recordTogether } from "#record-together.ts";

export const SessionEventJournal = defineService({
	id: "@antumbra/session-event-journal/SessionEventJournal",
	initialize: Effect.void,
	methods: () => ({ read, record, recordTogether }),
	requires: [Database, DomainFeeds],
});

export const SessionEventJournalLive = SessionEventJournal.layer;
