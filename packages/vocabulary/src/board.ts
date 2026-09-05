import { Schema } from "effect";

export const BoardRegisterSchema = Schema.Literals(["rough", "smooth"]);
export type BoardRegister = typeof BoardRegisterSchema.Type;

export const SUMMARY_LEVELS = ["day", "piece"] as const;

export const SummaryLevelSchema = Schema.Literals(SUMMARY_LEVELS);
export type SummaryLevel = typeof SummaryLevelSchema.Type;

export type BoardOwnerKind = "agent" | "piece" | "voyage";
