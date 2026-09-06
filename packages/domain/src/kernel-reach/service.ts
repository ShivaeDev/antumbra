import { defineService } from "@antumbra/service-definition/define-service.ts";
import { initializeKernelReach } from "#kernel-reach/initialize.ts";
import { makeInstall } from "#kernel-reach/install.ts";
import { makeQueueSiesta } from "#kernel-reach/queue-siesta.ts";
import { makeRouseSession } from "#kernel-reach/rouse-session.ts";
import { makeSettleWakes } from "#kernel-reach/settle-wakes.ts";
import { makeSubmitSpawn } from "#kernel-reach/submit-spawn.ts";
import { makeSubmitWake } from "#kernel-reach/submit-wake.ts";
import { makeWakePending } from "#kernel-reach/wake-pending.ts";

export const KernelReach = defineService({
	id: "@antumbra/domain/KernelReach",
	initialize: initializeKernelReach,
	methods: (installed) => ({
		install: makeInstall(installed),
		queueSiesta: makeQueueSiesta(installed),
		rouseSession: makeRouseSession(installed),
		settleWakes: makeSettleWakes(installed),
		submitSpawn: makeSubmitSpawn(installed),
		submitWake: makeSubmitWake(installed),
		wakePending: makeWakePending(installed),
	}),
	requires: [],
});
