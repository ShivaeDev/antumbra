import { postgresTests } from "@antumbra/app-testing/postgres-testing.ts";
import { replayPostgresFixture } from "@antumbra/legacy-fixture/replay.ts";
import { LegacyModel, legacyModel } from "@antumbra/legacy-fixture/v1/model.ts";
import { ServerToken } from "@antumbra/platform-rpc/token.ts";
import { voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { artifactFiles } from "@antumbra/server/adapters/artifacts/layer.ts";
import { ArtifactStorage } from "@antumbra/server/adapters/artifacts/storage.ts";
import { definition } from "@antumbra/server/definition.ts";
import { Files } from "@antumbra/server/files.ts";
import { checkFixture } from "@antumbra/server/fixture/check.ts";
import { capturedLogs } from "@antumbra/server/fixture/logs.ts";
import { legacySource } from "@antumbra/server/fixture/source.ts";
import { fixtureApplication } from "@antumbra/server/fixture.ts";
import { postgresDefinition } from "@antumbra/server/postgres-definition.ts";
import { snapshot } from "@antumbra/server/transcript/snapshot.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import { submit } from "@antumbra/server-inputs/submit.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { NodeServices } from "@effect/platform-node";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Clock, Effect, Exit, FileSystem, Layer, Path, Scope } from "effect";
import { capture, id, image, inputId, seed } from "#fixture/evidence.ts";
import { capturedLegacyFile } from "#test-support/legacy-file.ts";

const create = Effect.fn("FixtureStory.create")(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const root = yield* fs.makeTempDirectoryScoped();
	const logId = yield* capture(root);
	const lifetime = yield* Effect.scope;
	const app = fixtureApplication.pipe(
		Layer.provideMerge(legacySource),
		Layer.provideMerge(capturedLogs(root)),
		Layer.provideMerge(artifactFiles.pipe(Layer.provide(Layer.succeed(ArtifactStorage, { root: path.join(root, "artifacts") })))),
		Layer.provideMerge(Layer.succeed(Files, { root })),
		Layer.provideMerge(Layer.succeed(ServerToken, { token: "fixture" })),
	);
	const boot = Effect.gen(function* () {
		const scope = yield* Scope.fork(lifetime);
		const services = yield* Layer.build(app).pipe(Scope.provide(scope));
		return { scope, services };
	});
	let server = yield* boot;
	const run = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provideContext(server.services));
	return {
		seedArchive: Effect.gen(function* () {
			const file = yield* capturedLegacyFile();
			yield* run(replayPostgresFixture(file)).pipe(Effect.provideService(LegacyModel, legacyModel(definition)));
		}),
		openVoyage: (input: Parameters<(typeof Voyages)["Service"]["open"]>[0]) => run(Voyages.use((service) => service.open(input))),
		note: (id: VoyageId, body: string) =>
			run(
				Boards.use((service) =>
					service.write({ board: voyageBoard(id), body, author: null, register: "rough", requestId: Request.make("new-fixture-note") }),
				),
			),
		board: (id: VoyageId) => run(Boards.use((service) => service.digest({ board: voyageBoard(id) }))),
		seed: run(seed(logId)),
		voyages: () => run(Voyages.use((service) => service.list())),
		session: () => run(Sessions.use((service) => service.reading({ id }))),
		transcript: () =>
			run(
				Effect.gen(function* () {
					return yield* snapshot(yield* (yield* Sessions).transcriptSources({ id }), id);
				}),
			),
		send: () =>
			run(
				submit({
					id: inputId,
					sessionId: id,
					parts: [
						{ type: "image", name: "fixture.png", bytes: image },
						{ type: "text", text: "Local send" },
					],
				}),
			),
		request: () =>
			run(
				Effect.gen(function* () {
					yield* Agents.use((service) =>
						service.spawn({ requestId: Request.make("fixture-spawn"), role: "Local agent", backend: null, model: null, effort: null }),
					);
					const requestedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
					yield* Sessions.use((service) =>
						service.request({
							requestId: Request.make("fixture-wake"),
							sessionId: id,
							kind: "wake",
							inputId: null,
							reason: "Local wake",
							requestedAt,
						}),
					);
				}),
			),
		checked: () => run(checkFixture),
		input: () => run(Inputs.use((service) => service.reading({ sessionId: id, id: inputId }))),
		pending: () => run(Agents.use((service) => service.pending({}))),
		operations: () => run(Sessions.use((service) => service.operations({ sessionId: id }))),
		restart: Effect.gen(function* () {
			yield* Scope.close(server.scope, Exit.void);
			server = yield* boot;
		}),
	};
});
export const fixtureApp = storyKit({
	name: "Antumbra SQL fixture viewer",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer), Layer.provideMerge(postgresDefinition)),
	around: withIsolatedDatabase,
	stages: ["evidence"],
	create,
	verbs: (engine) => engine,
});
export const capturedWorkingSession = fixtureApp.trait("evidence", "a captured working Session", (engine) => engine.seed);

export const hasLegacyArchive = fixtureApp.trait("evidence", "an archived journal replayed into PostgreSQL", (engine) => engine.seedArchive);
