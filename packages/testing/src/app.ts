import { Boards, BoardsLive, type BoardsService } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { type RepoRegistry, Repos, ReposLive } from "@antumbra/repos";
import { Effect, Layer } from "effect";

export interface AppHarness {
	readonly boards: BoardsService;
	readonly db: DatabaseService;
	readonly repos: RepoRegistry;
}

const appLayer = Layer.mergeAll(BoardsLive, ReposLive).pipe(Layer.provide(DomainFeedsLive));

export const runWithApp = <A, E>(body: (harness: AppHarness) => Effect.fn.Return<A, E>) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const db = yield* Database;
		const repos = yield* Repos;
		return yield* Effect.gen(() => body({ boards, db, repos }));
	}).pipe(Effect.provide(appLayer));
