import { VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Voyage, type VoyageEvent, VoyageProgress } from "@antumbra/platform-vocabulary/voyage.ts";
import { Array, Effect } from "effect";
import { SqlClient } from "effect/sql";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";

export const apply = Effect.fn("VoyageHistory.apply")(function* ({
	value,
	streamVersion,
}: {
	readonly value: typeof VoyageEvent.Type;
	readonly streamVersion: number;
}) {
	const sql = yield* SqlClient.SqlClient;
	if (value._tag === "VoyageOpened") {
		const row = Voyage.make({
			id: value.id,
			kind: value.kind,
			name: value.name,
			northStar: value.northStar,
			context: value.context,
			openedAt: value.openedAt,
			focusedAt: null,
			quietedAt: null,
		});
		yield* sql`insert into "voyage" ${sql.insert({ ...row, opened_order: streamVersion })}`;
		const roles = Array.map(VOYAGE_AGENT_ROLES, (role) => ({
			...value[role],
			id: `${value.id}/${role}`,
			role,
			scope: value.id,
		}));
		yield* sql`insert into antumbra.voyage_roles ${sql.insert(roles)}`;
		yield* sql`insert into "roleSetting" ${sql.insert(roles)}`;
		const progress = VoyageProgress.make({
			id: row.id,
			total: 0,
			counts: { abandoned: 0, active: 0, blocked: 0, done: 0, held: 0, landing: 0, parked: 0, ready: 0 },
			state: "quiet",
			lastStirredAt: null,
			concluded: false,
		});
		yield* sql`insert into "voyageProgress" ${sql.insert({ ...progress, counts: JSON.stringify(progress.counts) })}`;
		yield* invalidateOnCommit([
			"roleSetting",
			...invalidationKeys([{ _tag: "Bucket", collection: "roleSetting", field: "scope", value: value.id }]),
			"voyageProgress",
		]);
	} else {
		const patch = value._tag === "FocusSet" ? { focusedAt: value.focusedAt } : { quietedAt: value.quietedAt };
		yield* sql`update "voyage" set ${sql.update(patch)} where id = ${value.id}`;
	}
	yield* invalidateOnCommit(["voyage"]);
});

export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "roleSetting" where scope in (select id from "voyage")`;
	yield* sql`delete from antumbra.voyage_roles`;
	yield* sql`delete from "voyageProgress"`;
	yield* sql`delete from "voyage"`;
	yield* invalidateOnCommit(["voyage", "roleSetting", "voyageProgress"]);
});
