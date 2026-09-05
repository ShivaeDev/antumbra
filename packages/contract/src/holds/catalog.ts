import { Schema } from "effect";
import type { SettingKey } from "#settings/catalog.ts";
import type { Settings } from "#settings/readings.ts";

export const HOLD_KINDS = ["dispatch", "wake"] as const;

export const HoldKind = Schema.Literals(HOLD_KINDS);
export type HoldKind = typeof HoldKind.Type;

export interface HoldDeclaration {
	readonly description: string;
	readonly quiet: string;
	readonly setting: SettingKey;
	readonly title: string;
}

export const HOLDS = {
	dispatch: {
		description: "Pieces that are launched and ready, waiting for an agent to be spawned on them.",
		quiet: "No launched piece is waiting for an agent.",
		setting: "holdPieceDispatch",
		title: "Piece dispatch",
	},
	wake: {
		description: "Agents at rest with mail due, waiting for the wake that carries it.",
		quiet: "No resting agent has mail due.",
		setting: "holdWakes",
		title: "Wakes",
	},
} as const satisfies Record<HoldKind, HoldDeclaration>;

export const holding = (settings: Settings, kind: HoldKind): boolean => settings.holdEverything || settings[HOLDS[kind].setting];
