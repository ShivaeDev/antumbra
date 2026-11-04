import { fact } from "@antumbra/platform-feature/fact.ts";
import { RepoRegisteredPayload } from "@antumbra/platform-vocabulary/repos-event.ts";
export const repoRegistered = fact("RepoRegistered", RepoRegisteredPayload.fields);
