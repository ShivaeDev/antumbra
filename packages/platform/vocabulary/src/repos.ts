import { Schema } from "effect";
import { RepoId } from "#repos-ids.ts";
export const Repo = Schema.Struct({ id: RepoId, name: Schema.String, source: Schema.String, defaultRef: Schema.String, createdAt: Schema.String });
export const RepoReference = Schema.Struct({ id: Schema.String, repoId: RepoId });
