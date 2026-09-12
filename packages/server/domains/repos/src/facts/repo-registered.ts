import { fact } from "@antumbra/platform-feature/fact.ts";
import { repo } from "#rows/repo.ts";

export const repoRegistered = fact("RepoRegistered", repo.fields);
