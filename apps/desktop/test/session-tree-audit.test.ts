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

// why: the two lines the stream did carry for the delegated agent, as the
// provider would have written them into its own transcript. Their uuids are the
// ones the frames were stamped with, which is what makes the diff a diff.
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
		yield* use.pipe(Effect.provide(rehearsalLayer(temporary, streamRehearsal, stored)));
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

			// why: every line the provider stored for this node reached its journal
			// under the uuid the provider stamped on both, so the diff is empty and
			// the ledger it projects from has nothing in it.
			expect(node.completeness).toBe("complete");
			const gaps = (yield* journal(node.id)).filter((row) => row.kind === "subsession.gap");
			expect(gaps).toHaveLength(0);
			// why: an audit is a reading of a node that stopped talking. The one
			// still open has not stopped, so nothing was concluded about it.
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

			// why: the node ended looking whole — a completed outcome, a report, a
			// journal that reads as a finished conversation. Only the provider's own
			// copy says a line of it never arrived, and the record says so too.
			expect(node.completeness).toBe("incomplete");
			expect(node.outcome).toBe("completed");
			const gap = (yield* journal(node.id)).find((row) => row.kind === "subsession.gap");
			// why: nothing was truncated and no stream detached; the frame simply
			// never arrived, and a loss with no name of its own takes the escape
			// hatch with a detail that says plainly what was missed.
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

			// why: this is the canary. An agent standing in the provider's own
			// directory that the stream never carried is what a lane quietly
			// dropping delegated frames looks like from here, and the census is the
			// only place it shows up at all.
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
			// why: the node the stream did carry is untouched by the census — it was
			// already admitted, and reading it back would write its words twice.
			const node = yield* nodeOf(receipt.sessionId, SUBSESSION);
			expect(node?.completeness).toBe("complete");
		}),
	),
);
