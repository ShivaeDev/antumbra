import { Database } from "@antumbra/persistence";
import type { SessionHandle } from "@antumbra/plugin-api";
import { type BerthedCharter, berthedCharter } from "@antumbra/prompts";
import { Repos } from "@antumbra/repos";
import { promptInput } from "@antumbra/sessions";
import { isVoyageCaptainIdentity } from "@antumbra/voyages/authority/captain";
import { Clock, Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";

interface BerthRow {
	readonly branch: string;
	readonly slug: string;
	readonly source: string;
}

type Moorage = Pick<BerthedCharter, "berths" | "moorageRoot">;

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

export const deliverCharter = Effect.fn("AgentBirth.deliverCharter")(function* (payload: SpawnFields, handle: SessionHandle) {
	const db = yield* Database;
	const registry = yield* Repos;
	const session = yield* db.AgentSession.where({ id: payload.sessionId }).first();
	if (Option.isSome(session) && session.value.charterDeliveredAt !== null) {
		return;
	}
	const moorage = yield* Effect.gen(function* () {
		const stored = yield* db.Moorage.where({ agentId: payload.agentId }).first();
		if (Option.isNone(stored)) {
			return { berths: [], moorageRoot: "" } satisfies Moorage;
		}
		const berths = yield* db.Berth.where({ agentId: payload.agentId })
			.orderBy((berth) => berth.createdAt.asc())
			.all();
		const repos = yield* registry.registered();
		return { berths: namedBerths(berths, repos), moorageRoot: stored.value.root } satisfies Moorage;
	});
	yield* handle.queue(promptInput(berthedCharter({ ...moorage, charter: payload.charter, role: roleFor(payload) })));
	const now = yield* Clock.currentTimeMillis;
	yield* db.AgentSession.where({ charterDeliveredAt: null, id: payload.sessionId }).update({ charterDeliveredAt: new Date(now) });
});
