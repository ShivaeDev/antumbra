import { Schema } from "effect";

export const RoleSettingSourceSchema = Schema.Literals(["chosen", "fleet", "backend"]);
export type RoleSettingSource = typeof RoleSettingSourceSchema.Type;

export const InheritedSchema = Schema.Literals(["fleet", "backend"]);
export type Inherited = typeof InheritedSchema.Type;

const INHERITED: Readonly<Record<Inherited, string>> = { backend: "backend default", fleet: "fleet default" };

export const inheritedWords = (source: Inherited): string => INHERITED[source];

export const inheritedFrom = (source: RoleSettingSource): string | undefined => (source === "chosen" ? undefined : INHERITED[source]);

export const UNLISTED_MODEL = "waiting for the backend to list its models";

export const UNDECLARED_EFFORT = "backend decides";
