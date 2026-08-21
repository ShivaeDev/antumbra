import { SightSource } from "@antumbra/contract";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Stream } from "effect";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
} from "#test/harness.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

interface NodeFields {
	readonly completeness: string;
	readonly kind: string | null;
	readonly label: string | null;
	readonly outcome: string | null;
	readonly status: string;
}

// why: this reads a tree the way any reader will — through the port, off the
// rows — so the fixture writes rows the way the tree writes them rather than
// driving a provider stream that another suite already rehearses.
const openNode = (
	id: string,
	agentId: string,
	parent: { readonly parentSessionId: string; readonly rootSessionId: string },
	fields: NodeFields,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.AgentSession.create({
				agentId,
				backend: "scripted",
				charterDeliveredAt: null,
				completeness: fields.completeness,
				cwd: `/tmp/moorage/${agentId}`,
				executionStatus: "active",
				id,
				kind: fields.kind,
				label: fields.label,
				nativeRef: `native-${id}`,
				outcome: fields.outcome,
				parentSessionId: parent.parentSessionId,
				rootSessionId: parent.rootSessionId,
				status: fields.status,
			} satisfies NewAgentSession),
		);
	});

const rooted = (rootSessionId: string) => ({
	parentSessionId: rootSessionId,
	rootSessionId,
});

const surveyor: NodeFields = {
	completeness: "recording",
	kind: ".codex/agents/reef-surveyor.md",
	label: null,
	outcome: null,
	status: "open",
};

const mapper: NodeFields = {
	completeness: "complete",
	kind: "Explore",
	label: "Map the quay grouping",
	outcome: "completed",
	status: "closed",
};

const spawned = Effect.gen(function* () {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	yield* eventually(
		Effect.gen(function* () {
			const fleet = yield* sight.fleet;
			expect(fleet.agents).not.toEqual([]);
		}),
	);
	return receipt;
});

it.live("reads a Session's whole tree, its depths and both its counts", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* spawned;
			yield* openNode(
				"session-child",
				receipt.agentId,
				rooted(receipt.sessionId),
				surveyor,
			);
			yield* openNode(
				"session-grandchild",
				receipt.agentId,
				{
					parentSessionId: "session-child",
					rootSessionId: receipt.sessionId,
				},
				mapper,
			);

			const tree = yield* sight.sessionTree(receipt.sessionId);
			expect(tree.nodes.map((node) => [node.id, node.depth])).toEqual([
				[receipt.sessionId, 0],
				["session-child", 1],
				["session-grandchild", 2],
			]);
			expect(tree.nodes.slice(1).map((node) => node.displayName)).toEqual([
				"reef-surveyor",
				"Map the quay grouping",
			]);
			expect(tree.nodes[2]).toMatchObject({
				completeness: "complete",
				nativeRef: "native-session-grandchild",
				outcome: "completed",
				status: "closed",
			});
			expect(tree.alive).toBe(2);
			expect(tree.total).toBe(3);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: the feed is what a window watches, so what it opens with is the whole
// answer the query would have given — a reader never sees a partial tree first
// and the rest of it later.
it.live("the tree feed opens with the picture the read would have given", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* spawned;
			yield* openNode(
				"session-child",
				receipt.agentId,
				rooted(receipt.sessionId),
				surveyor,
			);

			const opened = yield* Stream.runHead(
				sight.sessionTreeFeed(receipt.sessionId),
			);
			const read = yield* sight.sessionTree(receipt.sessionId);
			expect(Option.getOrUndefined(opened)).toEqual(read);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
