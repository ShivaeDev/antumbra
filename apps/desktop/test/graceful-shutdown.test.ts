import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Ref } from "effect";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";

const record = (calls: Ref.Ref<ReadonlyArray<string>>, call: string) => {
	Effect.runSync(Ref.update(calls, (all) => [...all, call]));
};

it.effect("coalesces quit requests and permits exit only after shutdown", () =>
	Effect.gen(function* () {
		let beforeQuit:
			| ((event: { readonly preventDefault: () => void }) => void)
			| undefined;
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
