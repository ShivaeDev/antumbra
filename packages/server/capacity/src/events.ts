import { capacityObserved } from "@antumbra/domain-capacity/facts/observed.ts";
import { capacityReleased } from "@antumbra/domain-capacity/facts/released.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("CapacityObserved", { ...capacityObserved.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("CapacityReleased", { ...capacityReleased.payload, at: Schema.Number, sequence: Schema.Number }),
]);
