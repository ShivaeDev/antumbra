import { AgentDomain } from "@antumbra/domain";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { Effect } from "effect";
import {
	type ClockMode,
	type Eventually,
	type HarnessClock,
	makeClock,
	makeEventually,
} from "#clock.ts";
import { dispatchingLayer } from "#domain-layers.ts";
import type { Around } from "#effect-it.ts";
import {
	type ScriptedBackend,
	makeScriptedBackend,
} from "#scripted-backend.ts";
import {
	type ScriptedRunner,
	makeScriptedRunner,
} from "#scripted-runner.ts";

const DISPATCHER = { maxAlive: 4, patienceMillis: 50 } as const;

export interface AppHarness {
	readonly backend: ScriptedBackend;
	readonly clock: HarnessClock;
	readonly db: DatabaseService;
	readonly domain: AgentDomain["Service"];
	readonly eventually: Eventually;
	readonly runner: ScriptedRunner;
}

const harnessOf = (
	backend: ScriptedBackend,
	runner: ScriptedRunner,
	mode: ClockMode,
) =>
	Effect.gen(function* () {
		return {
			backend,
			clock: makeClock(mode),
			db: yield* Database,
			domain: yield* AgentDomain,
			eventually: makeEventually(mode),
			runner,
		} satisfies AppHarness;
	});

export const withAppHarness: Around<AppHarness> = (body, mode) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const runner = yield* makeScriptedRunner;
		return yield* Effect.gen(function* () {
			return yield* body(yield* harnessOf(backend, runner, mode));
		}).pipe(
			Effect.provide(
				dispatchingLayer(
					temporary,
					backend.backend,
					DISPATCHER,
					{},
					runner.runner,
				),
			),
		);
	});
