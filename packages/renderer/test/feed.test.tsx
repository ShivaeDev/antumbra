// @vitest-environment happy-dom

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useFeed, useFeedLog } from "#hooks/feed.ts";

interface Opened {
	readonly key: string;
	readonly onError: (message: string) => void;
	readonly onValue: (message: string) => void;
	unsubscribed: boolean;
}

const open = (opened: Array<Opened>, key: string) => (onValue: Opened["onValue"], onError: Opened["onError"]) => {
	const subscription = {
		key,
		onError,
		onValue,
		unsubscribed: false,
	};
	opened.push(subscription);
	return () => {
		subscription.unsubscribed = true;
	};
};

const Snapshot = ({ feedKey, opened }: { readonly feedKey: string; readonly opened: Array<Opened> }) => {
	const { error, value } = useFeed<string>(feedKey, open(opened, feedKey));
	return <output data-error={error}>{value ?? "waiting"}</output>;
};

const Log = ({ opened }: { readonly opened: Array<Opened> }) => {
	const { error, value } = useFeedLog<string>("log", open(opened, "log"));
	return <output data-error={error}>{value.join("|") || "empty"}</output>;
};

const react = (action: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);

it.effect("owns a snapshot subscription for one key at a time", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		const opened: Array<Opened> = [];

		yield* react(() => root.render(<Snapshot feedKey="voyage-1" opened={opened} />));
		expect(container.textContent).toBe("waiting");

		yield* react(() => opened[0]?.onValue("first sight"));
		yield* react(() => opened[0]?.onValue("newest sight"));
		expect(container.textContent).toBe("newest sight");

		yield* react(() => opened[0]?.onError("bridge closed"));
		expect(container.firstElementChild?.getAttribute("data-error")).toBe("bridge closed");
		expect(container.textContent).toBe("newest sight");

		yield* react(() => root.render(<Snapshot feedKey="voyage-2" opened={opened} />));
		expect(opened.map(({ key }) => key)).toEqual(["voyage-1", "voyage-2"]);
		expect(opened[0]?.unsubscribed).toBe(true);
		expect(container.textContent).toBe("waiting");

		yield* react(() => root.unmount());
		expect(opened[1]?.unsubscribed).toBe(true);
	}),
);

it.effect("appends log entries in arrival order", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		const opened: Array<Opened> = [];

		yield* react(() => root.render(<Log opened={opened} />));
		expect(container.textContent).toBe("empty");

		yield* react(() => opened[0]?.onValue("raising the anchor"));
		yield* react(() => opened[0]?.onValue("clearing the harbour"));
		expect(container.textContent).toBe("raising the anchor|clearing the harbour");

		yield* react(() => root.unmount());
	}),
);
