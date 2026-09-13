import { Schema } from "effect";

export const RoleSettingSourceSchema = Schema.Literals(["chosen", "fleet", "backend"]);
export type RoleSettingSource = typeof RoleSettingSourceSchema.Type;

const INHERITED = { backend: "backend default", fleet: "fleet default" };

export type Inherited = keyof typeof INHERITED;

export const inheritedWords = (source: Inherited): string => INHERITED[source];

export const inheritedFrom = (source: RoleSettingSource): string | undefined => (source === "chosen" ? undefined : INHERITED[source]);

export const UNLISTED_MODEL = "waiting for the backend to list its models";

export const UNDECLARED_EFFORT = "backend decides";
