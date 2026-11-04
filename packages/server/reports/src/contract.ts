import { land } from "@antumbra/domain-reports/commands/land.ts";
import { byId } from "@antumbra/domain-reports/queries/by-id.ts";
import { byPiece } from "@antumbra/domain-reports/queries/by-piece.ts";
import { forVoyage } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Land = command("land", { payload: land.Input, success: Schema.Number, rejections: land.Rejection, invalidates: () => [] });
export const ById = query("byId", {
	payload: byId.input,
	success: byId.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ByPiece = query("byPiece", {
	payload: byPiece.input,
	success: byPiece.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ForVoyage = query("forVoyage", {
	payload: forVoyage.input,
	success: forVoyage.output,
	reads: () => [collection("report", Schema.String).list, collection("pieceReport", Schema.String).list, collection("piece", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ReportsContract = contract("reports", { commands: [Land], queries: [ById, ByPiece, ForVoyage] });
