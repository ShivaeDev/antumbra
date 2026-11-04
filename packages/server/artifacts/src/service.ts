import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { land } from "#commands/land.ts";
import { removeSupersession } from "#commands/remove-supersession.ts";
import { supersede } from "#commands/supersede.ts";
import { initialize } from "#initialize.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { readContent } from "#read-content.ts";
export const Artifacts = defineService({
	id: "@antumbra/server-artifacts/Artifacts",
	requires: [ArtifactsHistory, ArtifactFiles],
	initialize: initialize,
	methods: (serial) => ({
		supersede: supersede(serial),
		removeSupersession: removeSupersession(serial),
		land: land(serial),
		byId,
		byPiece,
		readContent,
	}),
});
