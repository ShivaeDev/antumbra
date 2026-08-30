import { Database } from "@antumbra/persistence";
import type { SessionHandle } from "@antumbra/plugin-api";
import { type BerthedCharter, berthedCharter } from "@antumbra/prompts";
import { promptInput } from "@antumbra/sessions";
import { Clock, Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

interface BerthRow {
	readonly branch: string;
	readonly slug: string;
	readonly source: string;
}

type Moorage = Pick<BerthedCharter, "berths" | "moorageRoot">;

// why: the berth carries the source it was cut from, and only the registry
// row turns that into the name a change tool accepts — a berth whose repo was
// forgotten can no longer be addressed and is left unnamed.
const namedBerths = (
	berths: ReadonlyArray<BerthRow>,
	repos: ReadonlyArray<{ readonly name: string; readonly source: string }>,
): BerthedCharter["berths"] =>
	berths.flatMap((berth) => {
		const repo = repos.find((row) => row.source === berth.source);
		return repo === undefined ? [] : [{ branch: berth.branch, folder: `./${berth.slug}`, repo: repo.name }];
	});

const roleFor = (payload: SpawnFields): BerthedCharter["role"] =>
	isVoyageCaptainIdentity(payload.role, spawnSessionIdentity(payload)) ? "captain" : "crew";

export const charterDelivery = Effect.gen(function* () {
	const db = yield* Database;
	const moorageOf = (agentId: string) =>
		Effect.gen(function* () {
			const moorage = yield* db.Moorage.where({ agentId }).first();
			if (Option.isNone(moorage)) {
				return { berths: [], moorageRoot: "" } satisfies Moorage;
			}
			const berths = yield* db.Berth.where({ agentId })
				.orderBy((berth) => berth.createdAt.asc())
				.all();
			const repos = yield* db.Repo.orderBy((repo) => repo.createdAt.asc()).all();
			return {
				berths: namedBerths(berths, repos),
				moorageRoot: moorage.value.root,
			} satisfies Moorage;
		});
	const stamp = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const now = yield* Clock.currentTimeMillis;
			yield* db.AgentSession.where({
				charterDeliveredAt: null,
				id: payload.sessionId,
			}).update({
				charterDeliveredAt: new Date(now),
			});
		});
	const deliverOnce = (payload: SpawnFields, handle: SessionHandle) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			const delivered = Option.isSome(session) && session.value.charterDeliveredAt !== null;
			if (delivered) {
				return;
			}
			const moorage = yield* moorageOf(payload.agentId);
			yield* handle.queue(
				promptInput(
					berthedCharter({
						...moorage,
						charter: payload.charter,
						role: roleFor(payload),
					}),
				),
			);
			yield* stamp(payload);
		});
	return { deliverOnce };
});
