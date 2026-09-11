import type { Choice } from "@antumbra/platform-feature/edit.ts";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { Held } from "#fields.ts";

export interface Offer {
	readonly label: string;
	readonly value: string;
}

export const inputOf = (choice: Choice, values: Held): Held | undefined => {
	const input: Record<string, unknown> = {};
	for (const [named, from] of Object.entries(choice.input)) {
		const held = values[from];
		if (held === null || held === undefined || held === "") {
			return undefined;
		}
		input[named] = held;
	}
	return input;
};

function held(row: unknown): Held | undefined;
function held(row: unknown): unknown {
	return typeof row === "object" && row !== null ? row : undefined;
}

const worded = (row: Held | undefined, name: string | undefined): string | undefined => {
	const value = name === undefined ? undefined : row?.[name];
	return typeof value === "string" ? value : undefined;
};

const offerOf = (choice: Choice, row: unknown): Offer | undefined => {
	if (typeof row === "string") {
		return { label: row, value: row };
	}
	const named = held(row);
	const value = worded(named, choice.value);
	return value === undefined ? undefined : { label: worded(named, choice.label) ?? value, value };
};

function rowsOf(listed: unknown): readonly unknown[];
function rowsOf(listed: unknown): unknown {
	return Array.isArray(listed) ? listed : [];
}

export const offersOf = (choice: Choice, listed: AsyncResult.AsyncResult<unknown, unknown>): readonly Offer[] => {
	const offers: Offer[] = [];
	for (const row of rowsOf(Option.getOrUndefined(AsyncResult.value(listed)))) {
		const offer = offerOf(choice, row);
		if (offer !== undefined) {
			offers.push(offer);
		}
	}
	return offers;
};
