import type { CommandShape } from "@antumbra/feature/command.ts";
import type { FeatureShape } from "@antumbra/feature/feature.ts";
import * as Id from "@antumbra/vocabulary/id.ts";
import type { Effect } from "effect";
import type { AppDefinition } from "#app.ts";
import type { CommitService } from "#commit.ts";
import type { Commits } from "#testing/surface.ts";

interface LooseCommit {
	readonly commit: (command: CommandShape, input: Record<string, unknown>) => Effect.Effect<number, unknown>;
}

function loose(service: CommitService): LooseCommit;
function loose(service: unknown): unknown {
	return service;
}

const commandsOf = (commit: LooseCommit, feature: FeatureShape): Record<string, unknown> =>
	Object.fromEntries(
		feature.commands.map((command) => [command.name, (input: Record<string, unknown>) => commit.commit(command, { ...input, requestId: Id.make() })]),
	);

export function commitsOf<Features extends readonly FeatureShape[]>(definition: AppDefinition<Features>, service: CommitService): Commits<Features>;
export function commitsOf(definition: AppDefinition, service: CommitService): unknown {
	const commit = loose(service);
	return Object.fromEntries(definition.features.map((feature) => [feature.name, commandsOf(commit, feature)]));
}
