import { it } from "@antumbra/app-testing/entry.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Deferred, Effect, Exit, Scope } from "effect";
import { expect } from "vitest";
import { each, run } from "#reconcile.ts";

const eligible = query("eligible", {
	input: {},
	output: counts.output,
	reads: counts.reads,
	run: (input, rows) =>
		Effect.map(counts.run(input, rows), (values) => values.filter((value) => value.key === "maxParallelSessions" && value.count >= 5)),
});

it.app("reconcilers run at boot and keep only the latest pending reading", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 3 });
	const entered = yield* Deferred.make<void>();
	const release = yield* Deferred.make<void>();
	const repeated = yield* Deferred.make<void>();
	const seen: number[] = [];
	const reconciler = yield* run(
		counts,
		{},
		Effect.fn(function* (rows) {
			seen.push(rows.find((row) => row.key === "maxParallelSessions")?.count ?? -1);
			if (seen.length === 1) {
				yield* Deferred.succeed(entered, undefined);
				yield* Deferred.await(release);
			} else yield* Deferred.succeed(repeated, undefined);
		}),
	);
	yield* Deferred.await(entered);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 6 });
	yield* reconciler.refresh;
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 7 });
	yield* reconciler.refresh;
	expect(seen).toEqual([3]);
	yield* Deferred.succeed(release, undefined);
	yield* Deferred.await(repeated);
	expect(seen).toEqual([3, 7]);
});

it.app("each retains successful claims until the row leaves the query", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 5 });
	const calls: number[] = [];
	const first = yield* Deferred.make<void>();
	const second = yield* Deferred.make<void>();
	const third = yield* Deferred.make<void>();
	const reconciler = yield* each(
		eligible,
		{},
		(row) => row.count,
		(row) =>
			Effect.gen(function* () {
				calls.push(row.count);
				if (calls.length === 1) yield* Deferred.succeed(first, undefined);
				else if (calls.length === 2) yield* Deferred.succeed(second, undefined);
				else yield* Deferred.succeed(third, undefined);
			}),
	);
	yield* Deferred.await(first);
	yield* reconciler.refresh;
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 3 });
	yield* reconciler.refresh;
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 6 });
	yield* reconciler.refresh;
	yield* Deferred.await(second);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 5 });
	yield* reconciler.refresh;
	yield* Deferred.await(third);
	expect(calls).toEqual([5, 6, 5]);
});

it.app("each scopes in-flight effects and reports defects to its supervisor", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 5 });
	const entered = yield* Deferred.make<void>();
	const exited = yield* Deferred.make<void>();
	const scope = yield* Scope.make();
	yield* each(
		eligible,
		{},
		(row) => row.key,
		() =>
			Effect.gen(function* () {
				yield* Effect.addFinalizer(() => Deferred.succeed(exited, undefined));
				yield* Deferred.succeed(entered, undefined);
				return yield* Effect.never;
			}),
	).pipe(Effect.provideService(Scope.Scope, scope));
	yield* Deferred.await(entered);
	yield* Scope.close(scope, Exit.void);
	yield* Deferred.await(exited);
	const failed = yield* each(
		eligible,
		{},
		(row) => row.key,
		() => Effect.die("edge defect"),
	);
	expect(Exit.isFailure(yield* Effect.exit(failed.await))).toBe(true);
});
