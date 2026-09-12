import { fact } from "@antumbra/platform-feature/fact.ts";
import { RepoId } from "#ids.ts";

export const repoForgotten = fact("RepoForgotten", { id: RepoId });
