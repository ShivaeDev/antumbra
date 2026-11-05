import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { LogDatabase, makeLog } from "@antumbra/runner-fabric/log.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { observation } from "@antumbra/server-storage/observe.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, FileSystem, Path } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";

export const id = SessionId.make("fixture-session");
export const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000099");
export const image = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);
export const capture = Effect.fn("FixtureStory.capture")(function* (root: string) {
	const path = yield* Path.Path;
	const logId = yield* Effect.gen(function* () {
		const sql = yield* SqliteClient.make({ filename: path.join(root, "runner.sqlite") });
		const log = yield* makeLog("captured").pipe(Effect.provideService(LogDatabase, { sql, backup: Effect.void }));
		yield* log.append({
			type: "ProviderEvent",
			observation: "live",
			sessionId: id,
			event: { type: "message", role: "agent", text: "Captured answer", raw: { source: "codex", kind: "event", payload: "{}" } },
		});
		return log.logId;
	}).pipe(Effect.provide(reactivityLayer), Effect.scoped);
	yield* (yield* FileSystem.FileSystem).writeFileString(
		path.join(root, "manifest.json"),
		JSON.stringify({ runnerLogs: [{ path: "runner.sqlite", seed: "captured" }] }),
	);
	return logId;
});

const started = {
	type: "started",
	agentId: "captured-agent",
	backend: "codex",
	cwd: "/historical/not-accessed",
	nativeRef: "native",
	runnerId: "old-runner",
	toolSetVersion: "1",
} as const;
export const seed = (logId: string) =>
	Effect.gen(function* () {
		yield* Backends.use((service) =>
			service.observeCapability({ requestId: Request.make("captured-capability"), backend: "codex", imageInput: true }),
		);
		yield* (yield* ExecutionHistory).ingest({
			logId,
			entries: [
				{
					cursor: 0,
					at: 1,
					before: Effect.void,
					facts: [
						observation(observed, {
							sessionId: id,
							live: true,
							nodeRef: null,
							origin: null,
							operationId: null,
							evidence: started,
						}),
					],
				},
				{
					cursor: 1,
					at: 2,
					before: Effect.void,
					facts: [
						observation(observed, {
							sessionId: id,
							live: true,
							nodeRef: null,
							origin: null,
							operationId: null,
							evidence: { type: "activity", state: "active" },
						}),
					],
				},
				{
					cursor: 2,
					at: 3,
					before: Effect.void,
					facts: [observation(providerEvent, { sessionId: id, logId, cursor: 0, observedAt: 1, origin: null, usage: null })],
				},
			],
		});
	});
