import { delivery } from "@antumbra/domain-inputs/commands/delivery.ts";
import {
	ImageUnavailable,
	InputAmbiguous,
	InputConflict,
	InputNotFound,
	InputRefused,
	InvalidInput,
} from "@antumbra/domain-inputs/commands/errors.ts";
import { record } from "@antumbra/domain-inputs/commands/record.ts";
import { retry } from "@antumbra/domain-inputs/commands/retry.ts";
import { deliveryReading } from "@antumbra/domain-inputs/queries/delivery.ts";
import { pending } from "@antumbra/domain-inputs/queries/pending.ts";
import { reading } from "@antumbra/domain-inputs/queries/reading.ts";
import { support } from "@antumbra/domain-inputs/queries/support.ts";
import { Draft, Image, ImageRequest, Receipt } from "@antumbra/platform-vocabulary/inputs.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Record = command("record", { payload: record.Input, success: Schema.Number, rejections: record.Rejection, invalidates: () => [] });
export const Delivery = command("delivery", {
	payload: delivery.Input,
	success: Schema.Number,
	rejections: delivery.Rejection,
	invalidates: () => [],
});
export const Retry = command("retry", { payload: retry.Input, success: Schema.Number, rejections: retry.Rejection, invalidates: () => [] });
export const Reading = query("reading", {
	payload: reading.input,
	success: reading.output,
	reads: (input) => [collection("sessionInput", Schema.String).item(input.sessionId)],
	readPolicy: () => Effect.succeed(true),
});
export const Pending = query("pending", {
	payload: pending.input,
	success: pending.output,
	reads: () => [collection("sessionInput", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const DeliveryReading = query("deliveryReading", {
	payload: deliveryReading.input,
	success: deliveryReading.output,
	reads: () => [collection("sessionInput", Schema.String).list, collection("sessionOperation", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Support = query("support", {
	payload: support.input,
	success: support.output,
	reads: () => [collection("session", Schema.String).list, collection("backendCatalog", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Submit = command("submit", {
	payload: Draft,
	success: Receipt,
	rejections: { InvalidInput, InputConflict, InputNotFound, ImageUnavailable, InputAmbiguous, InputRefused },
	invalidates: () => [],
});
export const ReadImage = query("image", {
	payload: ImageRequest,
	success: Image,
	rejections: { InvalidInput, InputConflict, InputNotFound, ImageUnavailable, InputAmbiguous, InputRefused },
	reads: () => [collection("sessionInput", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const InputsContract = contract("inputs", {
	commands: [Record, Delivery, Retry, Submit],
	queries: [Reading, Pending, DeliveryReading, Support, ReadImage],
});
