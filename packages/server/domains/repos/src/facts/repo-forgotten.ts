import { fact } from "@antumbra/platform-feature/fact.ts";
import { RepoForgottenPayload } from "@antumbra/platform-vocabulary/repos-event.ts";
export const repoForgotten = fact("RepoForgotten", RepoForgottenPayload.fields);
