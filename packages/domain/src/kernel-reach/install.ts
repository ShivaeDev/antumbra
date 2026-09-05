import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeInstall = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.install")((reach: KernelReachService) => Deferred.succeed(installed, reach).pipe(Effect.asVoid));
