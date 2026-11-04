import { hostCapabilities as query } from "@antumbra/domain-changes/commands/host-capability.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect, type Schema } from "effect";
export const hostCapabilities = Effect.fn("Changes.hostCapabilities")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ChangesHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
