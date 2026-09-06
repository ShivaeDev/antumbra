import { defineService } from "@antumbra/service-definition/define-service.ts";
import { genericMethod } from "@antumbra/service-definition/generic-method.ts";
import { makeAttached } from "#operations/attached.ts";
import { makeCloseStarts } from "#operations/close-starts.ts";
import { makeHolds } from "#operations/holds.ts";
import { makeIdleSince } from "#operations/idle-since.ts";
import { makeInterrupt } from "#operations/interrupt.ts";
import { makeReopenStarts } from "#operations/reopen-starts.ts";
import { makeSend } from "#operations/send.ts";
import { makeStart } from "#operations/start.ts";
import { makeStop } from "#operations/stop.ts";
import { makeStopIdle } from "#operations/stop-idle.ts";
import { makeTurnEnded } from "#operations/turn-ended.ts";
import { makeTurnMark } from "#operations/turn-mark.ts";
import { makeWithStartAdmission } from "#operations/with-start-admission.ts";
import { initializeSessionFabric } from "#session-fabric-state.ts";

export const SessionFabric = defineService({
	id: "@antumbra/session-fabric/SessionFabric",
	initialize: initializeSessionFabric,
	methods: (state) => ({
		attached: makeAttached(state.attachments),
		closeStarts: makeCloseStarts(state.startAdmission),
		holds: makeHolds(state.attachments),
		idleSince: makeIdleSince(state.attachments),
		interrupt: makeInterrupt(state.attachments),
		reopenStarts: makeReopenStarts(state.startAdmission),
		send: makeSend(state.attachments),
		start: genericMethod(makeStart(state.attachments, state.lifecycles)),
		stop: makeStop(state.attachments, state.lifecycles),
		stopIdle: makeStopIdle(state.attachments, state.lifecycles),
		turnEnded: makeTurnEnded(state.attachments),
		turnMark: makeTurnMark(state.attachments),
		withStartAdmission: genericMethod(makeWithStartAdmission(state.startAdmission)),
	}),
	requires: [],
});

export const SessionFabricLive = SessionFabric.layer;
