import { Database } from "@antumbra/persistence";
import { type Context, Effect } from "effect";

type DatabaseId = Context.Service.Identifier<typeof Database>;

export const commitArtifactLineage = <A, E, R>(
	program: Effect.Effect<A, E, R | DatabaseId>,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.transaction(program);
	});
