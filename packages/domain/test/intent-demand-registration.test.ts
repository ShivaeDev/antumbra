import { defineIntentDemand } from "@antumbra/intent-demand";
import { defineIntent, IntentExecution, Kernel, KernelLive } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";

const Payload = Schema.Struct({ slot: Schema.String });

const kind = (tag: string) =>
	defineIntent({
		execute: () => IntentExecution.use((execution) => execution.wait("held")),
		payload: Payload,
		tag,
	});

it.live("suppresses an active identity and submits only missing demand", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const registered = kind("test/demand-identity");
		const demand = defineIntentDemand({
			eligible: Effect.succeed([{ slot: "active" }, { slot: "missing" }]),
			identify: ({ slot }) => slot,
			kind: registered,
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const db = yield* Database;
			yield* kernel.submit(registered, { slot: "active" });
			yield* demand.pass;
			const rows = yield* db.Intent.where({ tag: registered.tag }).all();
			expect(yield* Effect.forEach(rows, (row) => registered.decode(row.payload))).toEqual([{ slot: "active" }, { slot: "missing" }]);
		}).pipe(Effect.provide(KernelLive({ kinds: [registered] }).pipe(Layer.provideMerge(temporary.layer))));
	}),
);

it.live("permits a successor after the prior intent is terminal", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const registered = kind("test/terminal-successor");
		const demand = defineIntentDemand({
			eligible: Effect.succeed([{ slot: "eventual" }]),
			identify: ({ slot }) => slot,
			kind: registered,
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Intent.create({
				detail: null,
				id: "terminal-intent",
				payload: yield* registered.encode({ slot: "eventual" }),
				status: "succeeded",
				tag: registered.tag,
			});
			yield* demand.pass;
			const rows = yield* db.Intent.where({ tag: registered.tag }).all();
			expect(rows).toHaveLength(2);
		}).pipe(Effect.provide(KernelLive({ kinds: [registered] }).pipe(Layer.provideMerge(temporary.layer))));
	}),
);

it.live("refuses duplicate demand identities before submission", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const registered = kind("test/duplicate-demand");
		const demand = defineIntentDemand({
			eligible: Effect.succeed([{ slot: "same" }, { slot: "same" }]),
			identify: ({ slot }) => slot,
			kind: registered,
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const failed = yield* Effect.flip(demand.pass);
			expect(failed.detail).toBe("eligible demand identity is duplicated: same");
			expect(yield* db.Intent.all()).toEqual([]);
		}).pipe(Effect.provide(KernelLive({ kinds: [registered] }).pipe(Layer.provideMerge(temporary.layer))));
	}),
);

it.live("fails closed for a same-tag non-identical Intent kind", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const registered = kind("test/demand-kind-identity");
		const impostor = kind("test/demand-kind-identity");
		const demand = defineIntentDemand({
			eligible: Effect.succeed([{ slot: "missing" }]),
			identify: ({ slot }) => slot,
			kind: impostor,
		});
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const failed = yield* Effect.flip(demand.pass);
			expect(failed.detail).toContain("UnregisteredIntentTag");
			expect(yield* db.Intent.all()).toEqual([]);
		}).pipe(Effect.provide(KernelLive({ kinds: [registered] }).pipe(Layer.provideMerge(temporary.layer))));
	}),
);
