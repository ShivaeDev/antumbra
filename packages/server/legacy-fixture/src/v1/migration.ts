import type { Effect } from "effect";

export interface StoredFact {
	readonly name: string;
	readonly payload: Record<string, unknown>;
	readonly at: number;
	readonly requestId: string;
	readonly seq: number;
}

export type MigrationBody = (stored: StoredFact) => Effect.Effect<StoredFact | undefined>;

export interface MigrationShape {
	readonly number: number;
	readonly fact: string;
	readonly rewrite: MigrationBody;
}

export const migration = (number: number, declaration: { readonly fact: string; readonly rewrite: MigrationBody }): MigrationShape => ({
	fact: declaration.fact,
	number,
	rewrite: declaration.rewrite,
});
