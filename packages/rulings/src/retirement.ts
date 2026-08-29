import type { RulingAuthority } from "@antumbra/vocabulary/ruling";

// why: a standing ruling leaves the standing set two ways and no others —
// a later ruling takes over its scope, or an authority retires it with none.
// Both append provenance and edit nothing, so they are one concept with two
// shapes rather than a flag on the record.

// why: the admiral overrules a ruling below by superseding it with a later
// one; the old ruling keeps its record and gains only who did it, when, and
// which ruling now speaks for its scope.
export interface RulingSupersedeInput {
	readonly by: RulingAuthority;
	readonly byRulingId: string;
	readonly rulingId: string;
}

export interface RulingSupersession {
	readonly at: Date;
	readonly by: RulingAuthority;
	readonly byRulingId: string;
}

// why: a withdrawal names no successor, so the note is what a later reader is
// left with about why the rule stopped applying — it is required for the same
// reason a supersession requires the ruling that takes over.
export interface RulingWithdrawInput {
	readonly by: RulingAuthority;
	readonly note: string;
	readonly rulingId: string;
}

export interface RulingWithdrawal {
	readonly at: Date;
	readonly by: RulingAuthority;
	readonly note: string;
}
