import {
	InputDeliveryChangedPayload,
	InputDeliveryObservedPayload,
	InputRecordedPayload,
	InputRetriedPayload,
} from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Schema } from "effect";

const stamp = { at: Schema.Number, sequence: Schema.Number };
export const Events = Schema.Union([
	Schema.TaggedStruct("InputRecorded", { ...InputRecordedPayload.fields, ...stamp }),
	Schema.TaggedStruct("InputDeliveryChanged", { ...InputDeliveryChangedPayload.fields, ...stamp }),
	Schema.TaggedStruct("InputDeliveryObserved", { ...InputDeliveryObservedPayload.fields, ...stamp }),
	Schema.TaggedStruct("InputRetried", { ...InputRetriedPayload.fields, ...stamp }),
]);
