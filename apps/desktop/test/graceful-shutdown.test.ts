import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Ref } from "effect";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";

const record = (calls: Ref.Ref<ReadonlyArray<string>>, call: string) => {
	Effect.runSync(Ref.update(calls, (all) => [...all, call]));
};

const runShutdownAttempt = (
	attempt: number,
	calls: Ref.Ref<ReadonlyArray<string>>,
	firstAttemptFiber: Deferred.Deferred<Fiber.Fiber<unknown, unknown>>,
	firstAttemptStarted: Deferred.Deferred<void>,
	retryAttemptStarted: Deferred.Deferred<void>,
	releaseRetry: Deferred.Deferred<void>,
) => {
	const result =
		attempt === 1
			? Effect.withFiber((fiber) => Deferred.succeed(firstAttemptFiber, fiber)).pipe(
					Effect.andThen(Deferred.succeed(firstAttemptStarted, undefined)),
					Effect.andThen(Effect.fail("drain failed")),
				)
			: Deferred.succeed(retryAttemptStarted, undefined).pipe(
					Effect.andThen(Deferred.await(releaseRetry)),
					Effect.andThen(Ref.update(calls, (all) => [...all, "dispose"])),
				);
	return Ref.update(calls, (all) => [...all, "drain"]).pipe(Effect.andThen(result));
};

it.effect("coalesces quit requests and permits exit only after shutdown", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const drainStarted = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const exited = yield* Deferred.make<void>();
		const finishQuit = () => {
			record(calls, "quit");
			Effect.runSync(Deferred.succeed(exited, undefined));
			beforeQuit?.({
				preventDefault: () => record(calls, "final-prevent"),
			});
		};
		yield* registerGracefulShutdown(
			{
				onBeforeQuit: (listener) => {
					beforeQuit = listener;
				},
				quit: finishQuit,
				relaunch: () => record(calls, "relaunch"),
			},
			Ref.update(calls, (all) => [...all, "drain"]).pipe(
				Effect.andThen(Deferred.succeed(drainStarted, undefined)),
				Effect.andThen(Deferred.await(release)),
				Effect.andThen(Ref.update(calls, (all) => [...all, "dispose"])),
			),
			yield* Ref.make(false),
			Effect.void,
		);
		const requestQuit = () =>
			beforeQuit?.({
				preventDefault: () => record(calls, "prevent"),
			});

		requestQuit();
		requestQuit();
		yield* Deferred.await(drainStarted);
		const waiting = yield* Ref.get(calls);
		expect(waiting.filter((call) => call === "prevent")).toHaveLength(2);
		expect(waiting.filter((call) => call === "drain")).toHaveLength(1);
		expect(waiting).not.toContain("dispose");
		expect(waiting).not.toContain("quit");

		yield* Deferred.succeed(release, undefined);
		yield* Deferred.await(exited);
		const finished = yield* Ref.get(calls);
		expect(finished.filter((call) => call === "drain")).toHaveLength(1);
		expect(finished.slice(-2)).toEqual(["dispose", "quit"]);
		expect(finished).not.toContain("final-prevent");
		expect(finished).not.toContain("relaunch");
	}),
);

it.effect("relaunches instead of quitting when the shutdown was asked for as a restart", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const relaunched = yield* Deferred.make<void>();
		yield* registerGracefulShutdown(
			{
				onBeforeQuit: (listener) => {
					beforeQuit = listener;
				},
				quit: () => record(calls, "quit"),
				relaunch: () => {
					record(calls, "relaunch");
					Effect.runSync(Deferred.succeed(relaunched, undefined));
				},
			},
			Ref.update(calls, (all) => [...all, "drain"]),
			yield* Ref.make(true),
			Effect.void,
		);

		beforeQuit?.({
			preventDefault: () => record(calls, "prevent"),
		});

		yield* Deferred.await(relaunched);
		expect(yield* Ref.get(calls)).toEqual(["prevent", "drain", "relaunch"]);
	}),
);

it.effect("abandons a restart whose drain failed, so the retried quit stays a quit", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const attempts = yield* Ref.make(0);
		const abandoned = yield* Deferred.make<void>();
		const quit = yield* Deferred.make<void>();
		const shutdown = Ref.updateAndGet(attempts, (attempt) => attempt + 1).pipe(
			Effect.flatMap((attempt) => (attempt === 1 ? Effect.fail("drain failed") : Ref.update(calls, (all) => [...all, "dispose"]))),
		);
		yield* registerGracefulShutdown(
			{
				onBeforeQuit: (listener) => {
					beforeQuit = listener;
				},
				quit: () => {
					record(calls, "quit");
					Effect.runSync(Deferred.succeed(quit, undefined));
				},
				relaunch: () => record(calls, "relaunch"),
			},
			shutdown,
			yield* Ref.make(true),
			Ref.update(calls, (all) => [...all, "abandon"]).pipe(Effect.andThen(Deferred.succeed(abandoned, undefined))),
		);
		const requestQuit = () =>
			beforeQuit?.({
				preventDefault: () => undefined,
			});

		requestQuit();
		yield* Deferred.await(abandoned);
		expect(yield* Ref.get(calls)).toEqual(["abandon"]);

		requestQuit();
		yield* Deferred.await(quit);
		expect(yield* Ref.get(calls)).toEqual(["abandon", "dispose", "quit"]);
	}),
);

it.effect("retries shutdown after failure and permits exactly one exit", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const attempts = yield* Ref.make(0);
		const firstAttemptFiber = yield* Deferred.make<Fiber.Fiber<unknown, unknown>>();
		const firstAttemptStarted = yield* Deferred.make<void>();
		const retryAttemptStarted = yield* Deferred.make<void>();
		const releaseRetry = yield* Deferred.make<void>();
		const exited = yield* Deferred.make<void>();
		const finishQuit = () => {
			record(calls, "quit");
			Effect.runSync(Deferred.succeed(exited, undefined));
			beforeQuit?.({
				preventDefault: () => record(calls, "final-prevent"),
			});
		};
		const shutdown = Ref.updateAndGet(attempts, (attempt) => attempt + 1).pipe(
			Effect.flatMap((attempt) => runShutdownAttempt(attempt, calls, firstAttemptFiber, firstAttemptStarted, retryAttemptStarted, releaseRetry)),
		);
		yield* registerGracefulShutdown(
			{
				onBeforeQuit: (listener) => {
					beforeQuit = listener;
				},
				quit: finishQuit,
				relaunch: () => record(calls, "relaunch"),
			},
			shutdown,
			yield* Ref.make(false),
			Effect.void,
		);
		const requestQuit = () =>
			beforeQuit?.({
				preventDefault: () => record(calls, "prevent"),
			});

		requestQuit();
		yield* Deferred.await(firstAttemptStarted);
		const firstAttempt = yield* Deferred.await(firstAttemptFiber);
		yield* Fiber.await(firstAttempt);
		const failed = yield* Ref.get(calls);
		expect(failed.filter((call) => call === "drain")).toHaveLength(1);
		expect(failed).not.toContain("dispose");
		expect(failed).not.toContain("quit");

		requestQuit();
		requestQuit();
		yield* Deferred.await(retryAttemptStarted);
		const retrying = yield* Ref.get(calls);
		expect(retrying.filter((call) => call === "prevent")).toHaveLength(3);
		expect(retrying.filter((call) => call === "drain")).toHaveLength(2);
		expect(retrying).not.toContain("dispose");
		expect(retrying).not.toContain("quit");

		yield* Deferred.succeed(releaseRetry, undefined);
		yield* Deferred.await(exited);
		const finished = yield* Ref.get(calls);
		expect(finished.filter((call) => call === "drain")).toHaveLength(2);
		expect(finished.filter((call) => call === "dispose")).toHaveLength(1);
		expect(finished.filter((call) => call === "quit")).toHaveLength(1);
		expect(finished.slice(-2)).toEqual(["dispose", "quit"]);
		expect(finished).not.toContain("final-prevent");
	}),
);
