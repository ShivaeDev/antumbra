import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { LifecycleRefused } from "@antumbra/platform-runner/lifecycle.ts";
import { Effect } from "effect";

export const drain = Effect.fn("Lifecycle.drain")(function* ({ requestId }: { readonly requestId: string }) {
	const runners = yield* RunnerOperations;
	const connected = yield* runners.connected;
	yield* Effect.forEach(
		connected,
		(runner) =>
			runners.execute(runner.runnerId, { type: "Drain", requestId: `${requestId}:${runner.runnerId}` }).pipe(
				Effect.flatMap((result) =>
					result.type === "Accepted"
						? Effect.void
						: Effect.fail(
								new LifecycleRefused({
									message: result.type === "Refused" ? result.reason : `Runner ${runner.runnerId} did not acknowledge drain`,
								}),
							),
				),
			),
		{ concurrency: "unbounded" },
	);
});
