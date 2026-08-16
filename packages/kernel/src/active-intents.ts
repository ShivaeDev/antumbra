import { Database } from "@antumbra/persistence";
import { Effect, Schema } from "effect";
import { StoredIntentInvalid, UnregisteredIntentTag } from "#errors.ts";
import { ActiveIntentStatusSchema, IntentStatusSchema } from "#fsm.ts";
import type { IntentKind } from "#intent.ts";
import type { ActiveIntent } from "#kernel.ts";
import { SchedulerState } from "#state.ts";

const decodeStatus = (id: string, status: string) =>
	Schema.decodeUnknownEffect(IntentStatusSchema)(status).pipe(
		Effect.mapError(
			(cause) => new StoredIntentInvalid({ detail: String(cause), id }),
		),
	);

const isActive = Schema.is(ActiveIntentStatusSchema);

const decodePayload = <Payload>(
	id: string,
	kind: IntentKind<Payload>,
	payloadJson: string,
) =>
	kind
		.decode(payloadJson)
		.pipe(
			Effect.mapError(
				(cause) => new StoredIntentInvalid({ detail: cause.detail, id }),
			),
		);

export const activeIntents = <Payload>(kind: IntentKind<Payload>) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		if (state.kinds.get(kind.tag) !== kind) {
			return yield* new UnregisteredIntentTag({ tag: kind.tag });
		}
		const db = yield* Database;
		const rows = yield* db.Intent.where({ tag: kind.tag }).all();
		const active: Array<ActiveIntent<Payload>> = [];
		for (const row of rows) {
			const status = yield* decodeStatus(row.id, row.status);
			if (!isActive(status)) {
				continue;
			}
			active.push({
				detail: row.detail,
				id: row.id,
				payload: yield* decodePayload(row.id, kind, row.payload),
				status,
			});
		}
		return active;
	});
