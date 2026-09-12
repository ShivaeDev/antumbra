import { Schema } from "effect";
import { RulingId } from "#ids.ts";
import type { Ruling } from "#rows/ruling.ts";
export const rejections = {
	Unknown: { rulingId: RulingId },
	AlreadyRuled: { rulingId: RulingId },
	NotRuled: { rulingId: RulingId },
	Retired: { rulingId: RulingId },
	Blank: { field: Schema.String, message: Schema.String },
};
export const standing = (ruling: Ruling): boolean => ruling.answer !== null && ruling.supersession === null && ruling.withdrawal === null;
