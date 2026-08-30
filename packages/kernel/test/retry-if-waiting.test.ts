import {
	applyMigrations,
	Database,
	type PrismaError,
} from "@antumbra/persistence";
import {
	acquireTemporaryPersistence,
	packagedMigrationsDirectory,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import {
	type Context,
	Effect,
	Fiber,
	Layer,
	Option,
	Schema,
	Stream,
} from "effect";
import type { IntentStatus } from "#fsm.ts";
import type { Gate } from "#gate.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { KernelLive } from "#layer.ts";
import { kernelLayer, statusesUntilTerminal } from "#test/harness.ts";
import { IntentExecution } from "#workflow.ts";

const CLOSED: Gate = { admits: () => false, id: "test/closed" };

const waitUntil = <E, R>(
	changes: Stream.Stream<IntentStatus, E, R>,
	status: IntentStatus,
) =>
	changes.pipe(
		Stream.takeUntil((current) => current === status),
		Stream.runDrain,
	);

const transientConnection = (failure: PrismaError): boolean =>
	failure.reason._tag === "PrismaConnectionFailure" &&
	failure.reason.transient === true;

const replaceDetail = (
	id: string,
	detail: string,
): Effect.Effect<
	unknown,
	PrismaError,
	Context.Service.Identifier<typeof Database>
> =>
	Database.use((db) =>
		db.Intent.where({ id })
			.update({ detail })
			.pipe(
				Effect.catchTag("PrismaError", (failure) =>
					transientConnection(failure)
						? Effect.yieldNow.pipe(Effect.andThen(replaceDetail(id, detail)))
						: Effect.fail(failure),
				),
			),
	);

it.live("retries only the waiting intent with the expected detail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const kind = defineIntent({
			execute: (payload) =>
				IntentExecution.use((execution) => execution.wait(payload.detail)),
			payload: Schema.Struct({ detail: Schema.String }),
			tag: "test/retry-if-waiting",
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const stale = yield* kernel.submit(kind, { detail: "capacity:stale" });
			const matching = yield* kernel.submit(kind, { detail: "capacity:match" });
			yield* waitUntil(stale.changes, "waiting");
			yield* waitUntil(matching.changes, "waiting");

			const nextTransition = yield* Effect.forkChild(
				Stream.runHead(kernel.transitions),
			);
			yield* Effect.yieldNow;
			expect(
				yield* kernel.retryIfWaiting(stale.id, "capacity:superseded"),
			).toBe(false);
			expect(yield* kernel.retryIfWaiting(matching.id, "capacity:match")).toBe(
				true,
			);
			expect(yield* Fiber.join(nextTransition)).toEqual(
				Option.some({ id: matching.id, status: "queued" }),
			);

			yield* waitUntil(kernel.changes(matching.id), "waiting");
			yield* kernel.cancel(stale.id);
			yield* kernel.cancel(matching.id);
			yield* statusesUntilTerminal(kernel.changes(stale.id));
			yield* statusesUntilTerminal(kernel.changes(matching.id));
		}).pipe(Effect.provide(kernelLayer(temporary, { kinds: [kind] })));
	}),
);

it.live("loses a retry race safely when the waiting detail changes", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* applyMigrations({
			database: temporary.database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const reached = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		let blocked = false;
		const databaseLayer = Database.layer({
			path: temporary.database,
			middleware: [
				{
					name: "hold-capacity-retry",
					beforeExecute(plan) {
						if (
							blocked ||
							plan.ast.kind !== "update" ||
							plan.ast.table.name !== "intent" ||
							!("status" in plan.ast.set)
						) {
							return;
						}
						blocked = true;
						reached.resolve();
						return release.promise;
					},
				},
			],
		});
		const kind = defineIntent({
			execute: () => Effect.void,
			payload: Schema.Struct({}),
			tag: "test/retry-detail-race",
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Intent.create({
				detail: "capacity:held",
				id: "retry-detail-race",
				payload: "{}",
				status: "waiting",
				tag: kind.tag,
			});
			const kernel = yield* Kernel;
			yield* Effect.gen(function* () {
				const retry = yield* Effect.forkScoped(
					kernel.retryIfWaiting("retry-detail-race", "capacity:held"),
				);
				yield* Effect.promise(() => reached.promise);
				yield* replaceDetail("retry-detail-race", "authentication required");
				release.resolve();
				expect(yield* Fiber.join(retry)).toBe(false);
				expect(
					(yield* db.Intent.where({ id: "retry-detail-race" }).first()).pipe(
						Option.getOrThrow,
					),
				).toMatchObject({
					detail: "authentication required",
					status: "waiting",
				});
			}).pipe(Effect.ensuring(Effect.sync(() => release.resolve())));
		}).pipe(
			Effect.provide(
				KernelLive({ gates: [CLOSED], kinds: [kind] }).pipe(
					Layer.provideMerge(databaseLayer),
				),
			),
		);
	}),
);
