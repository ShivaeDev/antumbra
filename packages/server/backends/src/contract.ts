import { listModels } from "@antumbra/domain-backends/commands/list-models.ts";
import { observeCapability } from "@antumbra/domain-backends/commands/observe-capability.ts";
import { catalog } from "@antumbra/domain-backends/queries/catalog.ts";
import { efforts } from "@antumbra/domain-backends/queries/efforts.ts";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const ListModels = command("listModels", {
	payload: listModels.Input,
	success: Schema.Number,
	rejections: {},
	invalidates: () => [],
});
export const Models = stream("models", {
	payload: models.input,
	success: models.output,
	reads: (input) => [{ _tag: "Bucket", collection: "backendModel", field: "backend", value: input.backend }],
});
export const Efforts = stream("efforts", {
	payload: efforts.input,
	success: efforts.output,
	reads: (input) => [{ _tag: "Bucket", collection: "backendModel", field: "backend", value: input.backend }],
});
export const Catalog = stream("catalog", {
	payload: catalog.input,
	success: catalog.output,
	reads: (input) => [collection("backendCatalog", Schema.String).item(input.backend)],
});
export const ObserveCapability = command("observeCapability", {
	payload: observeCapability.Input,
	success: Schema.Number,
	rejections: {},
	invalidates: () => [],
});
export const BackendsContract = contract("backends", { commands: [ListModels, ObserveCapability], streams: [Models, Efforts, Catalog] });
