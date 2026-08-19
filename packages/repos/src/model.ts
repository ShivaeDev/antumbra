import type { PrismaError } from "@antumbra/persistence";
import type { Effect } from "effect";
import type { RepoSlugTaken } from "#errors.ts";

export interface RegisteredRepo {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}

export interface RepoRegistration {
	readonly defaultRef: string;
	readonly source: string;
}

export interface RepoRegistry {
	readonly forget: (id: string) => Effect.Effect<void, PrismaError>;
	readonly list: Effect.Effect<ReadonlyArray<RegisteredRepo>, PrismaError>;
	readonly register: (
		registration: RepoRegistration,
	) => Effect.Effect<RegisteredRepo, PrismaError | RepoSlugTaken>;
}
