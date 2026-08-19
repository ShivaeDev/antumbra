import { expect, it } from "@effect/vitest";
import { Cause, Context, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { runManagedRuntimeStartup } from "#adapters/boot.ts";
import { drainManagedRuntime } from "#adapters/graceful-shutdown.ts";

class ProcessIdentity extends Context.Service<ProcessIdentity, object>()(
	"test/ProcessIdentity",
) {}

const countedIdentity = () => {
	let acquisitions = 0;
	let finalizations = 0;
	const layer = Layer.effect(
		ProcessIdentity,
		Effect.acquireRelease(
			Effect.sync(() => {
				acquisitions += 1;
				return {};
			}),
			() =>
				Effect.sync(() => {
					finalizations += 1;
				}),
		),
	);
	return {
		acquisitions: () => acquisitions,
		finalizations: () => finalizations,
		layer,
	};
};

it.effect(
	"shares one process service identity across a callback and retains it after startup",
	() =>
		Effect.gen(function* () {
			const counted = countedIdentity();
			const runtime = ManagedRuntime.make(counted.layer);
			const callback = () => runtime.runPromise(ProcessIdentity);
			const identities = yield* Effect.promise(() =>
				runManagedRuntimeStartup(
					runtime,
					Effect.gen(function* () {
						const direct = yield* ProcessIdentity;
						const fromCallback = yield* Effect.promise(callback);
						return { direct, fromCallback };
					}),
				),
			);

			expect(identities.fromCallback).toBe(identities.direct);
			expect(counted.acquisitions()).toBe(1);
			expect(counted.finalizations()).toBe(0);

			yield* drainManagedRuntime(runtime, Effect.void);
			expect(counted.finalizations()).toBe(1);
		}),
);

it.effect(
	"finalizes an acquired process runtime exactly once when startup fails",
	() =>
		Effect.gen(function* () {
			const counted = countedIdentity();
			const runtime = ManagedRuntime.make(counted.layer);
			const startup = ProcessIdentity.pipe(
				Effect.andThen(Effect.fail("startup failed")),
			);

			const exit = yield* Effect.exit(
				Effect.promise(() => runManagedRuntimeStartup(runtime, startup)),
			);
			expect(Exit.isFailure(exit)).toBe(true);
			expect(counted.acquisitions()).toBe(1);
			expect(counted.finalizations()).toBe(1);
		}),
);

it.effect(
	"reports the startup failure when runtime disposal also defects",
	() =>
		Effect.gen(function* () {
			const runtime = ManagedRuntime.make(
				Layer.effect(
					ProcessIdentity,
					Effect.acquireRelease(Effect.succeed({}), () =>
						Effect.die("dispose failed"),
					),
				),
			);
			const exit = yield* Effect.exit(
				Effect.promise(() =>
					runManagedRuntimeStartup(
						runtime,
						ProcessIdentity.pipe(Effect.andThen(Effect.fail("startup failed"))),
					),
				),
			);

			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const reported = Cause.pretty(exit.cause);
				expect(reported).toContain("startup failed");
				expect(reported).toContain("dispose failed");
			}
		}),
);
