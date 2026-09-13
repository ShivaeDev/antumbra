import { spawn } from "@antumbra/domain-agents/commands/spawn.ts";
import { pending as births } from "@antumbra/domain-agents/queries/pending.ts";
import { observeCapability } from "@antumbra/domain-backends/commands/observe-capability.ts";
import { reading as inputReading } from "@antumbra/domain-inputs/queries/reading.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { operations } from "@antumbra/domain-sessions/queries/operations.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { list as voyages } from "@antumbra/domain-voyages/queries/list.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { LogDatabase, makeLog } from "@antumbra/runner-fabric/log.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { DataDirectory } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { NodeServices } from "@effect/platform-node";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { it } from "@effect/vitest";
import { Clock, Effect, FileSystem, Layer, Path } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { expect } from "vitest";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
import { handlers } from "#adapters/inputs/handlers.ts";
import { definition } from "#definition.ts";
import { Files } from "#files.ts";
import { checkFixture } from "#fixture/check.ts";
import { capturedLogs } from "#fixture/logs.ts";
import { fixtureApplication } from "#fixture.ts";
import { snapshot } from "#transcript/snapshot.ts";

const id = SessionId.make("fixture-session");
const image = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);
const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000099");

it.effect("opens captured working evidence without execution and retains local intent across normal startup", () =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const root = yield* fs.makeTempDirectoryScoped();
		const storage = Journal.file().pipe(Layer.provide(Layer.succeed(DataDirectory, { path: root })));
		const journal = Journal.layer(definition).pipe(Layer.provide(storage));
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
		yield* fs.writeFileString(path.join(root, "manifest.json"), JSON.stringify({ runnerLogs: [{ path: "runner.sqlite", seed: "captured" }] }));
		yield* Effect.gen(function* () {
			const commit = yield* Commit;
			yield* commit.commit(observeCapability, { requestId: Request.make("captured-capability"), backend: "codex", imageInput: true });
			yield* commit.observe(observed, {
				logId,
				cursor: 0,
				at: 1,
				requestId: Request.make("observed-start"),
				payload: {
					sessionId: id,
					live: true,
					nodeRef: null,
					origin: null,
					operationId: null,
					evidence: {
						type: "started",
						agentId: "captured-agent",
						backend: "codex",
						cwd: "/historical/not-accessed",
						nativeRef: "native",
						runnerId: "old-runner",
						toolSetVersion: "1",
					},
				},
			});
			yield* commit.observe(observed, {
				logId,
				cursor: 1,
				at: 2,
				requestId: Request.make("observed-working"),
				payload: { sessionId: id, live: true, nodeRef: null, origin: null, operationId: null, evidence: { type: "activity", state: "active" } },
			});
			yield* commit.observe(providerEvent, {
				logId,
				cursor: 2,
				at: 3,
				requestId: Request.make("observed-message"),
				payload: { sessionId: id, logId, cursor: 0, observedAt: 1, origin: null, usage: null },
			});
		}).pipe(Effect.provide(journal), Effect.scoped);
		const app = fixtureApplication.pipe(
			Layer.provideMerge(
				Layer.mergeAll(
					storage,
					capturedLogs(root),
					artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(root, "artifacts") }))),
				),
			),
			Layer.provideMerge(Layer.succeed(Files, { root })),
			Layer.provide(Layer.succeed(ServerToken, { token: "fixture" })),
		);
		yield* Effect.gen(function* () {
			const live = yield* Live;
			const commit = yield* Commit;
			expect(yield* live.read(voyages, {})).toEqual([]);
			expect(yield* live.read(reading, { id })).toMatchObject({ attached: true, executionStatus: "active" });
			const transcript = yield* snapshot(yield* live.read(transcriptSources, { id }), id);
			expect(transcript.unavailable).toEqual([]);
			expect(JSON.stringify(transcript.items)).toContain("Captured answer");
			const inputs = yield* handlers(path.join(root, "session-inputs"));
			expect(
				yield* inputs["inputs.submit"]({
					id: inputId,
					sessionId: id,
					parts: [
						{ type: "image", name: "fixture.png", bytes: image },
						{ type: "text", text: "Local send" },
					],
				}),
			).toEqual({ id: inputId, status: "queued_for_wake" });
			yield* commit.commit(spawn, { requestId: Request.make("fixture-spawn"), role: "Local agent", backend: null, model: null, effort: null });
			yield* commit.commit(request, {
				requestId: Request.make("fixture-wake"),
				sessionId: id,
				kind: "wake",
				inputId: null,
				reason: "Local wake",
				requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
			});
			expect(yield* checkFixture).toEqual({ sessions: 1, artifacts: 0, images: 1 });
		}).pipe(Effect.provide(app), Effect.scoped);
		yield* Effect.gen(function* () {
			const live = yield* Live;
			expect(yield* live.read(reading, { id })).toMatchObject({ attached: true, executionStatus: "active" });
			expect(yield* live.read(inputReading, { sessionId: id, id: inputId })).toMatchObject({
				status: "queued_for_wake",
				parts: [{ type: "image" }, { type: "text", text: "Local send" }],
			});
			expect(yield* live.read(births, {})).toMatchObject([{ status: "requested", role: "Local agent" }]);
			expect(yield* live.read(operations, { sessionId: id })).toMatchObject([
				{ kind: "steer", status: "requested" },
				{ kind: "wake", status: "requested" },
			]);
		}).pipe(Effect.provide(app), Effect.scoped);
	}).pipe(Effect.provide(NodeServices.layer)),
);
