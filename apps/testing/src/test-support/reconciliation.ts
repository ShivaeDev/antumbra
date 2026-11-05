import { archiving } from "@antumbra/server/changes/archiving.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Effect, SubscriptionRef } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { eventually } from "#answers.ts";
import { claimedArchiving } from "#test-support/claimed-archiving.ts";

export const reconciliation = Effect.fn("PostgresApp.reconciliation")(function* () {
	const changes = yield* Changes;
	const reactivity = yield* Reactivity;
	let wakes = 0;
	yield* Effect.acquireRelease(
		Effect.sync(() =>
			reactivity.registerUnsafe(["change"], () => {
				wakes += 1;
			}),
		),
		(release) => Effect.sync(release),
	);
	return {
		claim: claimedArchiving(),
		start: Effect.gen(function* () {
			const work = yield* archiving();
			return {
				await: work.await,
				waiting: Effect.raceFirst(
					eventually(SubscriptionRef.changes(work.state), (state) => state.status === "waiting", "archiving to finish its pass"),
					Effect.andThen(work.await, Effect.never),
				),
			};
		}),
		wakes: () => wakes,
		archived: (id: string) =>
			eventually(
				reactivity.stream(["quayChange"], changes.quay({})),
				(rows) => rows.some((row) => row.id === id && row.group === "archived"),
				"the change to appear as archived",
			),
	};
});
