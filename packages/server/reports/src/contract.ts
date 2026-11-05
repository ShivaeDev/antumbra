import { land } from "@antumbra/domain-reports/commands/land.ts";
import { byId } from "@antumbra/domain-reports/queries/by-id.ts";
import { byPiece } from "@antumbra/domain-reports/queries/by-piece.ts";
import { forVoyage } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Land = command("land", { payload: land.Input, success: Schema.Number, rejections: land.Rejection, invalidates: () => [] });
export const ById = query("byId", {
	readPolicy: signedIn,
	payload: byId.input,
	success: byId.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list],
});
export const ByPiece = query("byPiece", {
	readPolicy: signedIn,
	payload: byPiece.input,
	success: byPiece.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list],
});
export const ForVoyage = query("forVoyage", {
	readPolicy: signedIn,
	payload: forVoyage.input,
	success: forVoyage.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list, collection("piece", Schema.String).list],
});
export const ReportsContract = contract("reports", { commands: [Land], queries: [ById, ByPiece, ForVoyage] });
