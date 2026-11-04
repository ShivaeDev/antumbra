import { Schema } from "effect";
import { CountKey, FlagKey } from "#settings-ids.ts";

export const FlagSetPayload = Schema.Struct({ keys: Schema.Array(FlagKey), on: Schema.Boolean });

export const CountSetPayload = Schema.Struct({ key: CountKey, count: Schema.Number });
export const SettingsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("FlagSet"), ...FlagSetPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("CountSet"), ...CountSetPayload.fields, at: Schema.Number }),
]);
