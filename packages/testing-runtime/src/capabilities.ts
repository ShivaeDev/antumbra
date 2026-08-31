import { Boards, BoardsLive, type BoardsService } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { type RepoRegistry, Repos, ReposLive } from "@antumbra/repos";
import { type Context, Effect, Layer } from "effect";
import { makeEffectApp } from "#effect-app.ts";

interface CapabilityHarness {
	readonly boards: BoardsService;
	readonly db: DatabaseService;
	readonly repos: RepoRegistry;
}

type CapabilityServices = Context.Service.Identifier<typeof Boards> | Context.Service.Identifier<typeof Repos>;

const capabilityLayer = Layer.mergeAll(BoardsLive, ReposLive).pipe(Layer.provide(DomainFeedsLive));

const capabilityHarness = Effect.gen(function* () {
	const boards = yield* Boards;
	const db = yield* Database;
	const repos = yield* Repos;
	return { boards, db, repos };
});

export const it = {
	effectApp: makeEffectApp<CapabilityHarness, CapabilityServices>(() => Effect.succeed({ harness: capabilityHarness, layer: capabilityLayer })),
};
