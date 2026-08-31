import type { RulingAuthority } from "@antumbra/vocabulary/ruling";

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
