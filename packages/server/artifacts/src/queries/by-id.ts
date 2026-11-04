import { byId as query } from "@antumbra/domain-artifacts/queries/by-id.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Artifacts.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ArtifactsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
