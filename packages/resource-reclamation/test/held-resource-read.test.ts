import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import {
	acquireTemporaryPersistence,
	type TemporaryPersistence,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import {
	type HeldResource,
	type HeldResourceRead,
	HeldResourceRead as HeldResourceReadService,
	ResourceReclaimRunnersLive,
	ResourceReconciler,
	ResourceReconcilerLive,
} from "#index.ts";
import { ResourceReclaimClaimInvalid } from "#resource-reclaim-errors.ts";

const layer = <E, R>(
	temporary: TemporaryPersistence,
	read: Effect.Effect<HeldResourceRead<E>, never, R>,
) =>
	ResourceReconcilerLive({ cadenceMillis: 60_000 }).pipe(
		Layer.provide(Layer.effect(HeldResourceReadService, read)),
		Layer.provide(ResourceReclaimRunnersLive(new Map())),
		Layer.provideMerge(DomainFeedsLive),
		Layer.provideMerge(temporary.layer),
	);

const TRANSACTION_RESOURCE = {
	branch: "work/transaction",
	id: "berth-transaction",
	source: "/repo/transaction",
};

const heldBySource = (
	resources: ReadonlyArray<HeldResource>,
	sources: ReadonlySet<string>,
) =>
	new Map(
		resources.flatMap((resource) =>
			sources.has(resource.source) ? [[resource.id, "held"] as const] : [],
		),
	);

const repoHeldResourceRead = Effect.gen(function* () {
	const db = yield* Database;
	return {
		held: (resources) =>
			db.Repo.all().pipe(
				Effect.map((repos) =>
					heldBySource(resources, new Set(repos.map((repo) => repo.source))),
				),
			),
	} satisfies HeldResourceRead<PrismaError>;
});

it.live("reads held evidence through the caller transaction executor", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const read = yield* repoHeldResourceRead;
			const held = yield* db.transaction(
				Database.use(() =>
					db.Repo.create({
						defaultRef: "main",
						id: "repo-transaction",
						name: "transaction",
						source: "/repo/transaction",
					}).pipe(Effect.andThen(read.held([TRANSACTION_RESOURCE]))),
				),
			);
			expect(held.get("berth-transaction")).toBe("held");
		}).pipe(Effect.provide(temporary.layer));
	}),
);

it.live(
	"exposes mortal degradation and recovery without failing the layer",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const fail = yield* Ref.make(true);
			const failure = new ResourceReclaimClaimInvalid({
				agentId: "agent-health",
				detail: "uncertain held truth",
			});
			const read = Effect.succeed({
				held: () =>
					Ref.get(fail).pipe(
						Effect.flatMap((shouldFail) =>
							shouldFail ? Effect.fail(failure) : Effect.succeed(new Map()),
						),
					),
			} satisfies HeldResourceRead<ResourceReclaimClaimInvalid>);
			yield* Effect.gen(function* () {
				const reconciler = yield* ResourceReconciler;
				expect(yield* reconciler.health).toMatchObject({ state: "degraded" });
				yield* Ref.set(fail, false);
				yield* reconciler.reconcile;
				expect(yield* reconciler.health).toMatchObject({ state: "healthy" });
			}).pipe(Effect.provide(layer(temporary, read)));
		}),
);
