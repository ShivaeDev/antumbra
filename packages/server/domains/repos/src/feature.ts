import { feature } from "@antumbra/platform-feature/feature.ts";
import { forget } from "#commands/forget.ts";
import { register } from "#commands/register.ts";
import { repoForgotten } from "#facts/repo-forgotten.ts";
import { repoRegistered } from "#facts/repo-registered.ts";
import { repoForgottenMaterializer } from "#materializers/repo-forgotten.ts";
import { repoRegisteredMaterializer } from "#materializers/repo-registered.ts";
import { all } from "#queries/all.ts";
import { byId } from "#queries/by-id.ts";
import { byIds } from "#queries/by-ids.ts";
import { repo } from "#rows/repo.ts";
import { repoReference } from "#rows/repo-reference.ts";

export const repos = feature("repos", {
	rows: [repo, repoReference],
	facts: [repoRegistered, repoForgotten],
	commands: [register, forget],
	materializers: [repoRegisteredMaterializer, repoForgottenMaterializer],
	queries: [all, byId, byIds],
});
