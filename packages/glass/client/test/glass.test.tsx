import { Unauthorized } from "@antumbra/platform-rpc/token.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Option, SubscriptionRef } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useLive, useSend } from "#hooks.ts";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until } from "#test/dom.ts";

type Api = Desk["glass"]["api"];

type Choose = (input: Parameters<Api["roleSettings"]["choose"]>[0]) => ReturnType<Api["roleSettings"]["choose"]>;

const Defaults = (props: { readonly api: Api }) => {
	const rows = useLive(props.api.roleSettings.defaults, {});
	const shown = Option.match(AsyncResult.value(rows), {
		onNone: () => "",
		onSome: (settings) => settings.map((setting) => `${setting.role}:${setting.backend ?? "-"}`).join(" "),
	});
	return <span data-testid="defaults">{shown}</span>;
};

const captain = { backend: "codex", effort: "high", model: "gpt", role: "captain", scope: "fleet" } as const;

const Sender = (props: { readonly api: Api; readonly ready: (send: Choose) => void }) => {
	props.ready(useSend(props.api.roleSettings.choose));
	return null;
};

const sending = (board: Desk) =>
	Effect.gen(function* () {
		const held: Choose[] = [];
		const { root } = yield* mount();
		yield* settle(() =>
			root.render(
				<board.glass.Provider>
					<Sender api={board.glass.api} ready={(send) => held.push(send)} />
				</board.glass.Provider>,
			),
		);
		const send = held[0];
		if (send === undefined) {
			return yield* Effect.die("the hook handed back no sender");
		}
		return send;
	});

it.live("re-renders a live query when a choose lands in its scope", () =>
	Effect.gen(function* () {
		const board = desk();
		yield* SubscriptionRef.set(board.settings, [
			{ backend: "claude", effort: null, id: "fleet/flagship", model: null, role: "flagship", scope: "fleet" },
		]);
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(
				<board.glass.Provider>
					<Defaults api={board.glass.api} />
				</board.glass.Provider>,
			),
		);
		const shown = () => container.querySelector('[data-testid="defaults"]')?.textContent ?? "";
		yield* until(() => shown() === "flagship:claude");
		yield* board.glass.api.roleSettings.choose({ backend: "codex", effort: null, model: null, role: "crew", scope: "fleet" });
		yield* until(() => shown() === "flagship:claude crew:codex");
	}),
);

it.live("answers a command sent from the hook with its sequence number", () =>
	Effect.gen(function* () {
		const board = desk();
		const send = yield* sending(board);
		expect(yield* send(captain)).toBe(1);
		expect(yield* send({ ...captain, backend: "claude" })).toBe(2);
		expect(board.sent).toHaveLength(2);
		expect(board.sent[1]).toMatchObject({ backend: "claude", role: "captain", scope: "fleet" });
	}),
);

it.live("answers a command sent with the wrong token with Unauthorized", () =>
	Effect.gen(function* () {
		const board = desk({ token: "the-wrong-token" });
		const send = yield* sending(board);
		expect(yield* Effect.flip(send(captain))).toBeInstanceOf(Unauthorized);
		expect(board.sent).toHaveLength(0);
	}),
);
