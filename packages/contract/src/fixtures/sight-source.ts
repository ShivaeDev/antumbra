import { Effect, Layer, Stream } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { fleet } from "#fixtures/fleet.ts";
import { sessionTree } from "#fixtures/session-tree.ts";
import { storedEvents } from "#fixtures/transcript.ts";
import { SightFailure, SightSource } from "#sight.ts";

export const sightFixture = (feeds: FixtureFeeds) =>
	Layer.succeed(SightSource, {
		fleet: Effect.succeed(fleet),
		fleetFeed: feeds.fleet,
		forgetRepo: () => Effect.void,
		interrupt: (sessionId) =>
			new SightFailure({ message: `session not live: ${sessionId}` }),
		registerRepo: (registration) =>
			Effect.succeed({
				defaultRef: registration.defaultRef,
				id: "repo-new",
				name: "shallows",
				source: registration.source,
			}),
		retire: () => Effect.void,
		send: (sessionId, text) =>
			text === ""
				? new SightFailure({
						message: `a message with no words cannot reach session ${sessionId}`,
					})
				: Effect.void,
		sessionEventFeed: (query) =>
			Stream.filter(feeds.events, (event) => event.seq >= query.fromSeq),
		sessionEvents: (query) =>
			Effect.succeed(
				storedEvents.filter((event) => event.seq >= query.fromSeq),
			),
		sessionTree: (rootSessionId) =>
			Effect.succeed({ ...sessionTree, rootSessionId }),
		sessionTreeFeed: (rootSessionId) =>
			Stream.make({ ...sessionTree, rootSessionId }),
		situationDraft: (draft) =>
			Effect.succeed(
				`Change #42 in shoals has merge conflicts: work/agent-1/reef no longer merges cleanly into main. Resolve them on ${draft.changeId} and say what you resolved.`,
			),
		sleep: () => Effect.void,
		spawn: (request) =>
			Effect.succeed({
				agentId: `agent-for-${request.role}`,
				sessionId: "session-new",
			}),
	});
