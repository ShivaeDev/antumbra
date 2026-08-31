import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { type StoredTranscripts, storedLine } from "#test/session-tree-audits.ts";
import { AGENT_CALL, NESTED_SUBSESSION, SUBSESSION, streamRehearsal } from "#test/session-tree-frames.ts";
import { acquireTemporaryPersistence, eventually, rehearsalLayer } from "#test/session-tree-harness.ts";

const MISSED_AGENT = "b7c6d5e4f3a2b1c09";
const SPOKEN = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f70";
const REPORTED = "7b8c9d0e-1f2a-4b3c-8d4e-6f7081920314";
const UNSEEN = "af019283-7465-4b3c-8d4e-6f7081920315";

const spawnRequest = {
	backend: "claude",
	charter: "chart the reef",
	role: "navigator",
};

const carried = [storedLine(SPOKEN, "reading the cluster", AGENT_CALL), storedLine(REPORTED, "the cluster maps cleanly", AGENT_CALL)];

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	});

const nodeOf = (rootSessionId: string, nativeRef: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ rootSessionId }).all();
		return rows.find((row) => row.nativeRef === nativeRef);
	});

const audited = (rootSessionId: string, nativeRef: string) =>
	eventually(
		Effect.gen(function* () {
			const row = yield* nodeOf(rootSessionId, nativeRef);
			expect(row?.completeness).not.toBe("recording");
			return row;
		}),
	);

const rehearsal = <A, E, R>(stored: StoredTranscripts, use: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* use.pipe(Effect.provide(rehearsalLayer(temporary, streamRehearsal, Effect.void, stored)));
	});

it.live("a node whose transcript the record holds in full reads complete", () =>
	rehearsal(
		new Map([[SUBSESSION, carried]]),
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const node = yield* audited(receipt.sessionId, SUBSESSION);
			if (node === undefined) {
				return;
			}

			expect(node.completeness).toBe("complete");
			const gaps = (yield* journal(node.id)).filter((row) => row.kind === "subsession.gap");
			expect(gaps).toHaveLength(0);
			const nested = yield* nodeOf(receipt.sessionId, NESTED_SUBSESSION);
			expect(nested?.completeness).toBe("recording");
		}),
	),
);

it.live("a line the provider stored and the stream never carried is a gap", () =>
	rehearsal(
		new Map([[SUBSESSION, [...carried, storedLine(UNSEEN, "one more thing", AGENT_CALL)]]]),
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const node = yield* audited(receipt.sessionId, SUBSESSION);
			if (node === undefined) {
				return;
			}

			expect(node.completeness).toBe("incomplete");
			expect(node.outcome).toBe("completed");
			const gap = (yield* journal(node.id)).find((row) => row.kind === "subsession.gap");
			expect(gap?.payload).toContain("unknown");
			expect(gap?.payload).toContain("1 of 3 transcript lines the provider stored");
			expect(gap?.payload).toContain(UNSEEN);
		}),
	),
);

it.live("an agent only the census found is admitted, and says so", () =>
	rehearsal(
		new Map([
			[SUBSESSION, carried],
			[MISSED_AGENT, [storedLine(UNSEEN, "the shoal is charted", AGENT_CALL)]],
		]),
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const found = yield* eventually(
				Effect.gen(function* () {
					const row = yield* nodeOf(receipt.sessionId, MISSED_AGENT);
					expect(row?.status).toBe("closed");
					return row;
				}),
			);
			if (found === undefined) {
				return;
			}

			expect(found).toMatchObject({
				agentId: receipt.agentId,
				completeness: "incomplete",
				outcome: "unknown",
				parentSessionId: receipt.sessionId,
				rootSessionId: receipt.sessionId,
			});
			const rows = yield* journal(found.id);
			expect(rows.map((row) => row.kind)).toEqual(["session.opened", "subsession.gap", "message"]);
			expect(rows[1]?.payload).toContain("census-missing");
			expect(rows[1]?.payload).toContain("the stream never carried it");
			expect(rows[2]?.payload).toContain("the shoal is charted");
			const node = yield* nodeOf(receipt.sessionId, SUBSESSION);
			expect(node?.completeness).toBe("complete");
		}),
	),
);
