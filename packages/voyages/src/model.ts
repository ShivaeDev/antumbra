import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";

export interface Voyage {
	readonly context: string;
	readonly focusedAt: Date | null;
	readonly id: string;
	readonly kind: VoyageKind;
	readonly name: string;
	readonly northStar: string;
	readonly openedAt: Date;
}

export interface OpenVoyageInput {
	readonly captainBackend?: string | undefined;
	readonly captainEffort?: string | undefined;
	readonly captainModel?: string | undefined;
	readonly context: string;
	readonly crewBackend?: string | undefined;
	readonly crewEffort?: string | undefined;
	readonly crewModel?: string | undefined;
	readonly id?: string;
	readonly name: string;
	readonly northStar: string;
}
