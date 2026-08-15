import {
	Database,
	type DatabaseService,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { type Context, Deferred, Effect, Option, Ref, Schema } from "effect";
import { defineIntent, type ReclaimPolicy } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import {
	acquireTemporaryPersistence,
	kernelLayer,
	statusesUntilTerminal,
} from "#test/harness.ts";
import { IntentExecution } from "#workflow.ts";

const EMPTY = Schema.Struct({});

const ensureMarker = (
	db: DatabaseService,
	writer: Writer["Service"],
	executors: Context.Context<WriteExecutors>,
) =>
	Effect.gen(function* () {
		const marker = yield* db.Agent.where({ id: "restart-marker" }).first();
		if (Option.isNone(marker)) {
			yield* writer.write(
				db.Agent.create({
					charter: "durable activity marker",
					id: "restart-marker",
					role: "test",
					status: "dormant",
				}),
			);
		}
	}).pipe(Effect.provideContext(executors));

const describeRow = (
	row: Option.Option<{
		readonly detail: string | null;
		readonly status: string;
	}>,
) => (Option.isSome(row) ? (row.value.detail ?? row.value.status) : "missing");

const strandRunningIntent = (temporary: TemporaryPersistence, tag: string) =>
	Effect.gen(function* () {
		const started = yield* Deferred.make<void>();
		const never = yield* Deferred.make<void>();
		const kind = defineIntent({
			execute: () =>
				Deferred.succeed(started, undefined).pipe(
					Effect.andThen(Deferred.await(never)),
				),
			payload: EMPTY,
			tag,
		});
		return yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(kind, {});
			yield* Deferred.await(started);
			return submission.id;
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	});

const rowAfterBoot = (
	temporary: TemporaryPersistence,
	id: string,
	tag: string,
	reclaim: ReclaimPolicy,
) =>
	Effect.gen(function* () {
		const finisher = defineIntent({
			execute: () => Effect.void,
			payload: EMPTY,
			reclaim,
			tag,
		});
		return yield* Effect.gen(function* () {
			const db = yield* Database;
			return yield* db.Intent.where({ id }).first();
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [finisher] })));
	});

it.live("leaves an interrupted intent as running on disk for reclaim", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const id = yield* strandRunningIntent(temporary, "test/stranded");
		const row = yield* Effect.gen(function* () {
			const db = yield* Database;
			return yield* db.Intent.where({ id }).first();
		}).pipe(Effect.provide(temporary.layer));
		expect(Option.isSome(row) ? row.value.status : null).toBe("running");
	}),
);

it.live("requeues a stranded running intent on the next boot", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const id = yield* strandRunningIntent(temporary, "test/requeue");
		const finisher = defineIntent({
			execute: () => Effect.void,
			payload: EMPTY,
			tag: "test/requeue",
		});
		const statuses = yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			return yield* statusesUntilTerminal(kernel.changes(id));
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [finisher] })));
		expect(statuses.at(-1)).toBe("succeeded");
	}),
);

it.live("restart reruns activities and reconciles completed durable work", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const entered = yield* Ref.make(0);
			const started = yield* Deferred.make<void>();
			const hold = yield* Deferred.make<void>();
			const establish = Ref.update(entered, (count) => count + 1).pipe(
				Effect.andThen(ensureMarker(db, writer, executors)),
			);
			const kind = defineIntent({
				execute: () =>
					Effect.gen(function* () {
						const execution = yield* IntentExecution;
						yield* execution
							.step("establish-marker", establish)
							.pipe(Effect.andThen(Deferred.succeed(started, undefined)));
						yield* execution.step("finish", Deferred.await(hold));
					}),
				payload: EMPTY,
				tag: "test/reconcile-restart",
			});
			const submission = yield* Effect.gen(function* () {
				const kernel = yield* Kernel;
				const submitted = yield* kernel.submit(kind, {});
				const first = yield* Effect.race(
					Deferred.await(started).pipe(Effect.as("started")),
					statusesUntilTerminal(submitted.changes).pipe(
						Effect.flatMap(() => db.Intent.where({ id: submitted.id }).first()),
						Effect.map(describeRow),
					),
				);
				expect(first).toBe("started");
				return submitted;
			}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
			yield* Deferred.succeed(hold, undefined);
			const statuses = yield* Effect.gen(function* () {
				const kernel = yield* Kernel;
				return yield* statusesUntilTerminal(kernel.changes(submission.id));
			}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
			expect(statuses.at(-1)).toBe("succeeded");
			expect(yield* Ref.get(entered)).toBe(2);
			expect(
				yield* db.Agent.where({ id: "restart-marker" }).all(),
			).toHaveLength(1);
		}).pipe(Effect.provide(temporary.layer));
	}),
);

it.live("abandons a stranded intent whose kind opted out of requeue", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const id = yield* strandRunningIntent(temporary, "test/abandoned");
		const row = yield* rowAfterBoot(temporary, id, "test/abandoned", "abandon");
		expect(Option.isSome(row) ? row.value.status : null).toBe("failed");
		expect(Option.isSome(row) ? row.value.detail : null).toContain(
			"abandoned by reclaim",
		);
	}),
);

it.live("abandons a stranded intent whose tag is no longer registered", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const id = yield* strandRunningIntent(temporary, "test/orphan");
		const row = yield* Effect.gen(function* () {
			const db = yield* Database;
			return yield* db.Intent.where({ id }).first();
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [] })));
		expect(Option.isSome(row) ? row.value.status : null).toBe("failed");
		expect(Option.isSome(row) ? row.value.detail : null).toContain(
			"no registered intent kind",
		);
	}),
);
