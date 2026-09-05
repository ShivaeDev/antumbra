import { Effect } from "effect";
import type { KernelReachService } from "#kernel-reach.ts";

const unexpected = (act: string) => Effect.die(new Error(`kernel-free test called KernelReach.${act}`));

export const fakeKernelReach: KernelReachService = {
	queueSiesta: () => unexpected("queueSiesta"),
	rouseSession: () => unexpected("rouseSession"),
	settleWakes: () => unexpected("settleWakes"),
	submitSpawn: () => unexpected("submitSpawn"),
	submitWake: () => unexpected("submitWake"),
	wakePending: () => unexpected("wakePending"),
};
