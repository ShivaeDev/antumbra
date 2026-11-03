import { charter } from "@antumbra/domain-pieces/commands/charter.ts";
import { landVerdict } from "@antumbra/domain-pieces/commands/land-verdict.ts";
import { launch } from "@antumbra/domain-pieces/commands/launch.ts";
import { park } from "@antumbra/domain-pieces/commands/park.ts";
import { rewire } from "@antumbra/domain-pieces/commands/rewire.ts";
import { unpark } from "@antumbra/domain-pieces/commands/unpark.ts";
import { all } from "@antumbra/domain-pieces/queries/all.ts";
import { byId } from "@antumbra/domain-pieces/queries/by-id.ts";
import { byVoyage } from "@antumbra/domain-pieces/queries/by-voyage.ts";
import { dependencies } from "@antumbra/domain-pieces/queries/dependencies.ts";
import { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { edges } from "@antumbra/domain-pieces/queries/edges.ts";
import { others } from "@antumbra/domain-pieces/queries/others.ts";
import { progress } from "@antumbra/domain-pieces/queries/progress.ts";
import { reach } from "@antumbra/domain-pieces/queries/reach.ts";
import { ready } from "@antumbra/domain-pieces/queries/ready.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";

const rows = collection("piece", Schema.String);
const edgeRows = collection("pieceEdge", Schema.String);
const progressRows = collection("pieceProgress", Schema.String);
const voyageRows = collection("voyage", Schema.String);

export const Charter = command("charter", {
	payload: charter.Input,
	success: Schema.Number,
	rejections: charter.Rejection,
	invalidates: () => [],
});
export const Launch = command("launch", {
	payload: launch.Input,
	success: Schema.Number,
	rejections: launch.Rejection,
	invalidates: () => [],
});
export const Park = command("park", {
	payload: park.Input,
	success: Schema.Number,
	rejections: park.Rejection,
	invalidates: () => [],
});
export const Unpark = command("unpark", {
	payload: unpark.Input,
	success: Schema.Number,
	rejections: unpark.Rejection,
	invalidates: () => [],
});
export const Rewire = command("rewire", {
	payload: rewire.Input,
	success: Schema.Number,
	rejections: rewire.Rejection,
	invalidates: () => [],
});
export const LandVerdict = command("landVerdict", {
	payload: landVerdict.Input,
	success: Schema.Number,
	rejections: landVerdict.Rejection,
	invalidates: () => [],
});
export const All = query("all", { payload: all.input, success: all.output, reads: () => [rows.list], readPolicy: () => Effect.succeed(true) });
export const ById = query("byId", {
	payload: byId.input,
	success: byId.output,
	reads: () => [rows.list],
	readPolicy: () => Effect.succeed(true),
});
export const ByVoyage = query("byVoyage", {
	payload: byVoyage.input,
	success: byVoyage.output,
	reads: (input) => [rows.item(input.voyageId)],
	readPolicy: () => Effect.succeed(true),
});
export const Others = query("others", {
	payload: others.input,
	success: others.output,
	reads: (input) => [rows.item(input.voyageId)],
	readPolicy: () => Effect.succeed(true),
});
export const Reach = query("reach", {
	payload: reach.input,
	success: reach.output,
	reads: (input) => [rows.item(input.voyageId)],
	readPolicy: () => Effect.succeed(true),
});
export const Edges = query("edges", {
	payload: edges.input,
	success: edges.output,
	reads: () => [rows.list, edgeRows.list],
	readPolicy: () => Effect.succeed(true),
});
export const Dependencies = query("dependencies", {
	payload: dependencies.input,
	success: dependencies.output,
	reads: () => [rows.list, edgeRows.list],
	readPolicy: () => Effect.succeed(true),
});
export const Progress = query("progress", {
	payload: progress.input,
	success: progress.output,
	reads: () => [progressRows.list],
	readPolicy: () => Effect.succeed(true),
});
export const DisplayByVoyage = query("displayByVoyage", {
	payload: displayByVoyage.input,
	success: displayByVoyage.output,
	reads: (input) => [rows.item(input.voyageId), progressRows.item(input.voyageId)],
	readPolicy: () => Effect.succeed(true),
});
export const Ready = query("ready", {
	payload: ready.input,
	success: ready.output,
	reads: () => [rows.list, progressRows.list, voyageRows.list],
	readPolicy: () => Effect.succeed(true),
});

export const PiecesContract = contract("pieces", {
	commands: [Charter, Launch, Park, Unpark, Rewire, LandVerdict],
	queries: [All, ById, ByVoyage, Others, Reach, Edges, Dependencies, Progress, DisplayByVoyage, Ready],
});
