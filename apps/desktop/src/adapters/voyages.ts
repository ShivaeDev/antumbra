import { DomainFeeds } from "@antumbra/domain-feeds";
import type { voyages } from "@antumbra/domain-voyages/feature.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Database } from "@antumbra/persistence";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";
import { captainRoleOf } from "@antumbra/voyages/captain-role";
import { VoyageNotFound } from "@antumbra/voyages/errors";
import type { OpenVoyageInput, Voyage } from "@antumbra/voyages/model";
import { Voyages, type VoyagesService } from "@antumbra/voyages";
import { type Context, Effect, Layer, Option, Schema } from "effect";
import { once, ServerReach } from "#adapters/server-reach.ts";

type Reach<Failure> = Api<readonly [typeof voyages], Failure>;

type Feeds = Effect.Success<typeof DomainFeeds>;

type Store = Effect.Success<typeof Database>;

interface Stored {
	readonly context: string;
	readonly focusedAt: string | null;
	readonly id: string;
	readonly kind: VoyageKind;
	readonly name: string;
	readonly northStar: string;
	readonly openedAt: string;
}

const taggedBackend = Schema.decodeUnknownEffect(Schema.NullOr(AgentBackendTagSchema));

const named = (value: string | undefined): string | null => (value === undefined || value === "" ? null : value);

const voyageOf = (stored: Stored): Voyage => ({
	context: stored.context,
	focusedAt: stored.focusedAt === null ? null : new Date(stored.focusedAt),
	id: stored.id,
	kind: stored.kind,
	name: stored.name,
	northStar: stored.northStar,
	openedAt: new Date(stored.openedAt),
});

const asked = (input: OpenVoyageInput, kind: VoyageKind, requestId: Id.Request) =>
	Effect.gen(function* () {
		const captainBackend = yield* Effect.orDie(taggedBackend(named(input.captainBackend)));
		const crewBackend = yield* Effect.orDie(taggedBackend(named(input.crewBackend)));
		return {
			captainBackend,
			captainEffort: named(input.captainEffort),
			captainModel: named(input.captainModel),
			context: input.context,
			crewBackend,
			crewEffort: named(input.crewEffort),
			crewModel: named(input.crewModel),
			kind,
			name: input.name,
			northStar: input.northStar,
			requestId,
		};
	});

const readOne = <Failure extends { readonly _tag: string }>(reach: Reach<Failure>, voyageId: string) =>
	Effect.map(once(reach.voyages.byId({ id: VoyageId.make(voyageId) })), (stored) => (stored === null ? Option.none() : Option.some(voyageOf(stored))));

const openOne = <Failure extends { readonly _tag: string }>(reach: Reach<Failure>, feeds: Feeds, input: OpenVoyageInput, kind: VoyageKind, requestId: Id.Request) =>
	Effect.gen(function* () {
		yield* Effect.orDie(reach.voyages.open(yield* asked(input, kind, requestId)));
		yield* feeds.publishVoyageRefresh();
		const opened = yield* readOne(reach, requestId);
		return yield* Option.match(opened, {
			onNone: () => Effect.die(new Error(`the journal opened voyage ${requestId} and does not hold it`)),
			onSome: Effect.succeed,
		});
	});

export const voyagesOver = <Failure extends { readonly _tag: string }>(reach: Reach<Failure>, store: Store, feeds: Feeds): VoyagesService => ({
	assignAgent: Effect.fn("Voyages.assignAgent")(function* (voyageId: string, agentId: string, role: string) {
		const existing = yield* store.VoyageAgent.where({ agentId, voyageId }).first();
		if (Option.isSome(existing)) {
			return;
		}
		yield* store.VoyageAgent.create({ agentId, role, voyageId });
		yield* feeds.publishVoyageRefresh();
	}, Effect.orDie),
	byId: (voyageId: string) => readOne(reach, voyageId),
	captainRole: Effect.fn("Voyages.captainRole")(function* (voyageId: string) {
		const voyage = yield* readOne(reach, voyageId);
		return Option.match(voyage, { onNone: (): AgentRole => "captain", onSome: (row) => captainRoleOf(row.kind) });
	}),
	ensureFlagship: Effect.fn("Voyages.ensureFlagship")(function* (input: OpenVoyageInput) {
		const sailing = yield* once(reach.voyages.list({}));
		if (sailing.some((stored) => stored.kind === "flagship")) {
			return;
		}
		yield* openOne(reach, feeds, input, "flagship", FLAGSHIP_REQUEST);
	}),
	list: () => Effect.map(once(reach.voyages.list({})), (sailing) => sailing.map(voyageOf)),
	open: (input: OpenVoyageInput) => openOne(reach, feeds, input, "voyage", Id.Request.make(input.id ?? Id.make())),
	setFocus: Effect.fn("Voyages.setFocus")(function* (voyageId: string, focused: boolean) {
		yield* reach.voyages
			.setFocus({ focused, id: VoyageId.make(voyageId) })
			.pipe(Effect.catchTag("Unknown", () => new VoyageNotFound({ voyageId })), Effect.orDie);
		yield* feeds.publishVoyageRefresh();
	}),
	verifyExists: Effect.fn("Voyages.verifyExists")(function* (voyageId: string) {
		if (Option.isNone(yield* readOne(reach, voyageId))) {
			return yield* new VoyageNotFound({ voyageId });
		}
	}),
});

export const VoyagesOverRpc: Layer.Layer<
	Voyages,
	never,
	Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds> | ServerReach
> = Layer.effect(Voyages)(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const store = yield* Database;
		return voyagesOver(yield* ServerReach, store, feeds);
	}),
);
