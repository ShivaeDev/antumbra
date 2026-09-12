import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { StoredArtifactContentInvalid } from "@antumbra/domain-artifacts/queries/content.ts";
import { Cause, Option, Schema } from "effect";

export const readFailure = (cause: Cause.Cause<unknown>): string => {
	const failure = Cause.findErrorOption(cause);
	if (Option.isNone(failure)) return "The Artifact could not be read.";
	if (Schema.is(land.Rejection.ArtifactNotFound)(failure.value)) return "This Artifact could not be found.";
	if (Schema.is(StoredArtifactContentInvalid)(failure.value)) return "The stored Artifact could not be verified.";
	return failure.value instanceof Error && failure.value.message !== "" ? failure.value.message : "The Artifact could not be read.";
};
