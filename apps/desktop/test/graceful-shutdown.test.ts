import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Ref } from "effect";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";

const record = (calls: Ref.Ref<ReadonlyArray<string>>, call: string) => {
	Effect.runSync(Ref.update(calls, (all) => [...all, call]));
};

const runShutdownAttempt = (
	attempt: number,
	calls: Ref.Ref<ReadonlyArray<string>>,
	firstAttemptStarted: Deferred.Deferred<void>,
	releaseRetry: Deferred.Deferred<void>,
) => {
	const result =
		attempt === 1
			? Deferred.succeed(firstAttemptStarted, undefined).pipe(Effect.andThen(Effect.fail("drain failed")))
			: Deferred.await(releaseRetry).pipe(Effect.andThen(Ref.update(calls, (all) => [...all, "dispose"])));
	return Ref.update(calls, (all) => [...all, "drain"]).pipe(Effect.andThen(result));
};

it.effect("coalesces quit requests and permits exit only after shutdown", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
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
			},
			Ref.update(calls, (all) => [...all, "drain"]).pipe(
				Effect.andThen(Deferred.await(release)),
				Effect.andThen(Ref.update(calls, (all) => [...all, "dispose"])),
			),
		);
		const requestQuit = () =>
			beforeQuit?.({
				preventDefault: () => record(calls, "prevent"),
			});

		requestQuit();
		requestQuit();
		yield* Effect.yieldNow;
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
	}),
);

it.effect("retries shutdown after failure and permits exactly one exit", () =>
	Effect.gen(function* () {
		let beforeQuit: ((event: { readonly preventDefault: () => void }) => void) | undefined;
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const attempts = yield* Ref.make(0);
		const firstAttemptStarted = yield* Deferred.make<void>();
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
			Effect.flatMap((attempt) => runShutdownAttempt(attempt, calls, firstAttemptStarted, releaseRetry)),
		);
		yield* registerGracefulShutdown(
			{
				onBeforeQuit: (listener) => {
					beforeQuit = listener;
				},
				quit: finishQuit,
			},
			shutdown,
		);
		const requestQuit = () =>
			beforeQuit?.({
				preventDefault: () => record(calls, "prevent"),
			});

		requestQuit();
		yield* Deferred.await(firstAttemptStarted);
		yield* Effect.yieldNow;
		const failed = yield* Ref.get(calls);
		expect(failed.filter((call) => call === "drain")).toHaveLength(1);
		expect(failed).not.toContain("dispose");
		expect(failed).not.toContain("quit");

		requestQuit();
		requestQuit();
		yield* Effect.yieldNow;
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
