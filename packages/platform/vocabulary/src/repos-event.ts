import { Schema } from "effect";
import { Repo, RepoReference } from "#repos.ts";
import { RepoId } from "#repos-ids.ts";
export const RepoRegisteredPayload = Schema.Struct(Repo.fields);
export const RepoForgottenPayload = Schema.Struct({ id: RepoId });
export const ReposEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("RepoReferencesObserved"), references: Schema.Array(RepoReference), at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("RepoRegistered"), ...RepoRegisteredPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("RepoForgotten"), ...RepoForgottenPayload.fields, at: Schema.Number }),
]);
