import { feature } from "@antumbra/platform-feature/feature.ts";
import { clear } from "#commands/clear.ts";
import { record } from "#commands/record.ts";
import { restartCleared } from "#facts/restart-cleared.ts";
import { restartRecorded } from "#facts/restart-recorded.ts";
import { restartClearedMaterializer } from "#materializers/restart-cleared.ts";
import { restartRecordedMaterializer } from "#materializers/restart-recorded.ts";
import { pending } from "#queries/pending.ts";
import { restart } from "#rows/restart.ts";
export const lifecycle = feature("lifecycle", {
	rows: [restart],
	facts: [restartRecorded, restartCleared],
	commands: [record, clear],
	materializers: [restartRecordedMaterializer, restartClearedMaterializer],
	queries: [pending],
});
