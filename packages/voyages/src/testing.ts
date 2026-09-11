import { Database } from "@antumbra/persistence";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";
import { RoleSettings } from "@antumbra/settings";
import { Clock, type Context, Effect, Layer, Option, Ref } from "effect";
import { captainRoleOf } from "#captain-role.ts";
import { VoyageNotFound } from "#errors.ts";
import type { OpenVoyageInput, Voyage } from "#model.ts";
import { Voyages } from "#service.ts";

type Sailing = ReadonlyMap<string, Voyage>;

const named = (value: string | undefined): string | null => (value === undefined || value === "" ? null : value);

const seatsOf = (input: OpenVoyageInput) => [
	{ choice: { backend: named(input.captainBackend), effort: named(input.captainEffort), model: named(input.captainModel) }, role: "captain" } as const,
	{ choice: { backend: named(input.crewBackend), effort: named(input.crewEffort), model: named(input.crewModel) }, role: "crew" } as const,
];

const openedAt = (input: OpenVoyageInput, kind: VoyageKind, at: number): Voyage => ({
	context: input.context,
	focusedAt: null,
	id: input.id ?? crypto.randomUUID(),
	kind,
	name: input.name,
	northStar: input.northStar,
	openedAt: new Date(at),
});

export const scriptedVoyages: Layer.Layer<Voyages, never, Context.Service.Identifier<typeof Database> | RoleSettings> = Layer.effect(Voyages)(
	Effect.gen(function* () {
		const db = yield* Database;
		const roles = yield* RoleSettings;
		const state = yield* Ref.make<Sailing>(new Map());
		const held = (voyageId: string) => Effect.map(Ref.get(state), (sailing) => Option.fromNullishOr(sailing.get(voyageId)));
		const written = (voyage: Voyage) => Ref.update(state, (sailing) => new Map(sailing).set(voyage.id, voyage));
		const opening = Effect.fnUntraced(function* (input: OpenVoyageInput, kind: VoyageKind) {
			const voyage = openedAt(input, kind, yield* Clock.currentTimeMillis);
			yield* written(voyage);
			for (const seat of seatsOf(input)) {
				yield* roles.changeForVoyage(voyage.id, seat.role, seat.choice);
			}
			return voyage;
		});
		return {
			assignAgent: Effect.fnUntraced(function* (voyageId: string, agentId: string, role: string) {
				const existing = yield* db.VoyageAgent.where({ agentId, voyageId }).first();
				if (Option.isNone(existing)) {
					yield* db.VoyageAgent.create({ agentId, role, voyageId });
				}
			}, Effect.orDie),
			byId: held,
			captainRole: (voyageId: string) =>
				Effect.map(held(voyageId), Option.match({ onNone: (): AgentRole => "captain", onSome: (voyage) => captainRoleOf(voyage.kind) })),
			ensureFlagship: Effect.fnUntraced(function* (input: OpenVoyageInput) {
				const sailing = yield* Ref.get(state);
				if ([...sailing.values()].some((voyage) => voyage.kind === "flagship")) {
					return;
				}
				yield* opening(input, "flagship");
			}),
			list: () =>
				Effect.map(Ref.get(state), (sailing) =>
					[...sailing.values()].toSorted((left, right) => left.openedAt.getTime() - right.openedAt.getTime()),
				),
			open: (input: OpenVoyageInput) => opening(input, "voyage"),
			setFocus: Effect.fnUntraced(function* (voyageId: string, focused: boolean) {
				const voyage = yield* held(voyageId);
				if (Option.isNone(voyage)) {
					return yield* new VoyageNotFound({ voyageId });
				}
				yield* written({ ...voyage.value, focusedAt: focused ? new Date(yield* Clock.currentTimeMillis) : null });
			}),
			verifyExists: Effect.fnUntraced(function* (voyageId: string) {
				if (Option.isNone(yield* held(voyageId))) {
					return yield* new VoyageNotFound({ voyageId });
				}
			}),
		};
	}),
);
