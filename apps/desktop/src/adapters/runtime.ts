import { claudePlugin } from "@antumbra/backend-claude";
import { codexPlugin } from "@antumbra/backend-codex";
import { opencodePlugin } from "@antumbra/backend-opencode";
import { applicationLayers as domainApplicationLayers } from "@antumbra/domain";
import { githubPlugin } from "@antumbra/github";
import { databaseFileInDataDirectory, PersistenceLive } from "@antumbra/persistence";
import { makePluginHost } from "@antumbra/plugin-api";
import { localRunnerPlugin } from "@antumbra/runner-local";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { findOnLoginPath } from "#adapters/login-shell.ts";
import {
	artifactsInDataDirectory,
	configureDataDirectory,
	persistenceMigrationsDirectory,
	runnerRootsInDataDirectory,
	sessionInputsInDataDirectory,
	skillsDirectory,
} from "#adapters/shell.ts";

const persistence = Layer.unwrap(
	Effect.sync(() =>
		PersistenceLive({
			database: databaseFileInDataDirectory(configureDataDirectory()),
			migrationsDirectory: persistenceMigrationsDirectory(),
		}),
	),
);

const application = Layer.unwrap(
	Effect.gen(function* () {
		const host = yield* makePluginHost({ findExecutable: findOnLoginPath });
		const runnerPlugin = localRunnerPlugin(runnerRootsInDataDirectory(configureDataDirectory()));
		const skills = skillsDirectory();
		yield* Effect.orDie(claudePlugin({ skills }).activate(host.context));
		yield* Effect.orDie(codexPlugin({ cwd: configureDataDirectory(), skills }).activate(host.context));
		yield* Effect.orDie(opencodePlugin({ cwd: configureDataDirectory() }).activate(host.context));
		yield* Effect.orDie(runnerPlugin.activate(host.context));
		yield* Effect.orDie(githubPlugin().activate(host.context));
		return domainApplicationLayers(
			yield* host.backends,
			yield* host.runners,
			yield* host.changeHosts,
			artifactsInDataDirectory(configureDataDirectory()),
			sessionInputsInDataDirectory(configureDataDirectory()),
		).pipe(Layer.provide(NodeServices.layer));
	}),
);

export const applicationLayers = () => application.pipe(Layer.provideMerge(persistence));
