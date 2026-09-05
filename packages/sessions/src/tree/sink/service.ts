import { defineService } from "@antumbra/service-definition";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { Effect } from "effect";
import { SessionTreeLifecycle } from "#tree/lifecycle/service.ts";
import { LiveDelegations } from "#tree/live.ts";
import { create } from "#tree/sink/create.ts";
import { SessionTreeSweeps } from "#tree/sweeps/service.ts";
import { SessionTurnRests } from "#turn-rest/service.ts";

export const SessionTreeSinks = defineService({
	id: "@antumbra/sessions/SessionTreeSinks",
	initialize: Effect.void,
	methods: () => ({ create }),
	requires: [SessionEventJournal, SessionTreeLifecycle, SessionTreeSweeps, LiveDelegations, SessionTurnRests],
});
