import { dispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import { rest } from "@antumbra/domain-agents/queries/rest.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { pendingSmoothing } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { pending as pendingRestart } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { SwitchKey } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { Schema } from "effect";
import { Waiting } from "#queries/waiting.ts";

export const HoldQueue = Schema.Struct({
	setting: SwitchKey,
	title: Schema.String,
	description: Schema.String,
	on: Schema.Boolean,
	held: Schema.Boolean,
	waiting: Schema.Array(Waiting),
});

export const QuietVoyage = Schema.Struct({
	id: VoyageId,
	name: Schema.String,
	waiting: Schema.Array(Waiting),
});

export const queues = query("queues", {
	input: {},
	output: Schema.Struct({ everything: Schema.Boolean, queues: Schema.Array(HoldQueue), quieted: Schema.Array(QuietVoyage) }),
	reads: [...dispatch.reads, ...dueWakes.reads, ...rest.reads, ...pendingSmoothing.reads, ...pendingRestart.reads, voyageAgent, voyage, flag],
});
