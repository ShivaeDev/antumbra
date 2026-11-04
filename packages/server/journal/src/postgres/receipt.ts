import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const checkRequest = (store: string) =>
	Effect.fn("Postgres.checkRequest")(function* (requestId: Request) {
		const sql = yield* SqlClient.SqlClient;
		const done = yield* sql`select version from events_requests where store = ${store} and request_id = ${requestId}`.pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ version: Schema.Number })))),
		);
		if (done[0] !== undefined) return yield* Effect.fail(new AlreadyDone({ requestId, seq: done[0].version }));
	});
