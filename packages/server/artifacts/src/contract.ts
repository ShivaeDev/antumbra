import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { Landing } from "@antumbra/domain-artifacts/commands/landing.ts";
import { removeSupersession } from "@antumbra/domain-artifacts/commands/remove-supersession.ts";
import { supersede } from "@antumbra/domain-artifacts/commands/supersede.ts";
import { ArtifactPublicationFailed } from "@antumbra/domain-artifacts/ports/errors.ts";
import { byId } from "@antumbra/domain-artifacts/queries/by-id.ts";
import { byPiece } from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { ArtifactMarkdown, StoredArtifactContentInvalid } from "@antumbra/domain-artifacts/queries/content.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Supersede = command("supersede", {
	payload: supersede.Input,
	success: Schema.Number,
	rejections: supersede.Rejection,
	invalidates: () => [],
});
export const RemoveSupersession = command("removeSupersession", {
	payload: removeSupersession.Input,
	success: Schema.Number,
	rejections: removeSupersession.Rejection,
	invalidates: () => [],
});
export const Land = command("land", {
	payload: Landing,
	success: Schema.Number,
	rejections: { ...land.Rejection, ArtifactPublicationFailed },
	invalidates: () => [],
});
export const ById = query("byId", {
	readPolicy: signedIn,
	payload: byId.input,
	success: byId.output,
	reads: () => [collection("artifact", Schema.String).list],
});
export const ByPiece = query("byPiece", {
	readPolicy: signedIn,
	payload: byPiece.input,
	success: byPiece.output,
	reads: (input) => [{ _tag: "Bucket", collection: "artifact", field: "pieceId", value: input.pieceId }],
});
export const ReadContent = query("readContent", {
	readPolicy: signedIn,
	payload: { artifactId: ArtifactId },
	success: ArtifactMarkdown,
	rejections: { ArtifactNotFound: land.Rejection.ArtifactNotFound, StoredArtifactContentInvalid },
	reads: () => [collection("artifact", Schema.String).list],
});
export const ArtifactsContract = contract("artifacts", { commands: [Supersede, RemoveSupersession, Land], queries: [ById, ByPiece, ReadContent] });
