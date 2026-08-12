import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Schema } from "effect";
import { defineIntent, type ReclaimPolicy } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import {
	acquireTemporaryPersistence,
	kernelLayer,
	statusesUntilTerminal,
} from "#test/harness.ts";

const EMPTY = Schema.Struct({});

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
