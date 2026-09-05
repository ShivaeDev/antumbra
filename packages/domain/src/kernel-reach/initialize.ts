import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const initializeKernelReach = Effect.fn("KernelReach.initialize")(() => Deferred.make<KernelReachService>())();
