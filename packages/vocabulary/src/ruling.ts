import { Data, Option, Result, Schema } from "effect";

export const RulingRadiusSchema = Schema.Literals(["piece", "voyage", "fleet"]);
export type RulingRadius = typeof RulingRadiusSchema.Type;

export const RulingUrgencySchema = Schema.Literals(["blocking", "pressing", "eventual"]);
export type RulingUrgency = typeof RulingUrgencySchema.Type;

export const RulingSubjectKindSchema = Schema.Literals(["repo", "voyage", "piece", "agent", "tag"]);
export type RulingSubjectKind = typeof RulingSubjectKindSchema.Type;

export const RulingAuthoritySchema = Schema.Literals(["admiral", "flagship", "captain"]);
export type RulingAuthority = typeof RulingAuthoritySchema.Type;

export const RulingKindSchema = Schema.Literals(["ruling", "approval", "delegation"]);
export type RulingKind = typeof RulingKindSchema.Type;

export class StoredRulingValueInvalid extends Data.TaggedError("StoredRulingValueInvalid")<{
	readonly field: string;
	readonly rulingId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Ruling ${this.rulingId} has invalid ${this.field}: ${String(this.value)}`;
	}
}

const storedValue =
	<Value>(decode: (value: unknown) => Option.Option<Value>, field: string) =>
	(rulingId: string, value: unknown): Result.Result<Value, StoredRulingValueInvalid> => {
		const decoded = decode(value);
		return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredRulingValueInvalid({ field, rulingId, value }));
	};

export const decodeStoredRulingRadius = storedValue(Schema.decodeUnknownOption(RulingRadiusSchema), "radius");

export const decodeStoredRulingUrgency = storedValue(Schema.decodeUnknownOption(RulingUrgencySchema), "urgency");

export const decodeStoredRulingSubjectKind = storedValue(Schema.decodeUnknownOption(RulingSubjectKindSchema), "subject kind");

export const decodeStoredRulingAuthority = storedValue(Schema.decodeUnknownOption(RulingAuthoritySchema), "authority");

export const decodeStoredRulingKind = storedValue(Schema.decodeUnknownOption(RulingKindSchema), "kind");

const URGENCY_RANK: Readonly<Record<RulingUrgency, number>> = {
	blocking: 0,
	eventual: 2,
	pressing: 1,
};

const RADIUS_RANK: Readonly<Record<RulingRadius, number>> = {
	fleet: 0,
	piece: 2,
	voyage: 1,
};

export const rulingUrgencyRank = (urgency: RulingUrgency): number => URGENCY_RANK[urgency];

export const rulingRadiusRank = (radius: RulingRadius): number => RADIUS_RANK[radius];
