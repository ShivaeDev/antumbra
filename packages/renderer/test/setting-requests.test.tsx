import { SETTINGS, type SettingChange, type SettingKey, SettingsReading, type SettingValue } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Schema } from "effect";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { SettingRow } from "#views/setting-row.tsx";

const { changeSetting } = vi.hoisted(() => ({ changeSetting: vi.fn() }));
vi.mock("#adapters/trpc-settings.ts", () => ({ changeSetting }));
beforeEach(() => changeSetting.mockReset());
const reading = Schema.decodeUnknownSync(SettingsReading)({
	overridden: [],
	settings: Object.fromEntries(Object.entries(SETTINGS).map(([key, declaration]) => [key, declaration.fallback])),
});
const settle = (action: () => void) =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);
const CurrentSetting = ({ settingKey }: { readonly settingKey: SettingKey }) => {
	const [saved, setSaved] = useState(reading);
	return (
		<SettingRow settingKey={settingKey} value={saved.settings[settingKey]} overridden={saved.overridden.includes(settingKey)} onSettings={setSaved} />
	);
};
const mount = (settingKey: SettingKey) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		yield* settle(() => root.render(<CurrentSetting settingKey={settingKey} />));
	});
const input = (): HTMLInputElement => {
	const field = document.querySelector("input");
	if (field === null) return Effect.runSync(Effect.die("Missing setting field"));
	return field;
};
const write = (value: string) => {
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input(), value);
	input().dispatchEvent(new Event("input", { bubbles: true }));
};
const saved = (key: SettingKey, value: SettingValue): SettingsReading => ({ overridden: [key], settings: { ...reading.settings, [key]: value } });

it.effect.each(["", "0", "1.5", "65"])("rejects count draft '%s' and accepts the declaration boundary", (raw) =>
	Effect.gen(function* () {
		changeSetting.mockReturnValue(Effect.succeed(saved("maxParallelSessions", 64)));
		yield* mount("maxParallelSessions");
		yield* settle(() => write(raw));
		expect(document.querySelector("button")?.disabled).toBe(true);
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(changeSetting).not.toHaveBeenCalled();
		yield* settle(() => write("64"));
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(changeSetting).toHaveBeenCalledWith({ key: "maxParallelSessions", value: 64 });
		expect(input().value).toBe("64");
		expect(document.querySelector("button")?.disabled).toBe(true);
		expect(document.body.textContent).toContain("Set by you.");
	}),
);

it.effect.each([
	{ key: "maxParallelSessions", next: 6, raw: "06" },
	{ key: "retireSweep", next: false, raw: "" },
] satisfies ReadonlyArray<{ readonly key: SettingKey; readonly next: SettingValue; readonly raw: string }>)(
	"keeps $key pending and failed values separate from the saved reading",
	({ key, next, raw }) =>
		Effect.gen(function* () {
			const first = yield* Deferred.make<SettingsReading, RendererRequestError>();
			const second = yield* Deferred.make<SettingsReading>();
			const started = yield* Deferred.make<SettingChange>();
			const retried = yield* Deferred.make<void>();
			changeSetting.mockImplementationOnce((change: SettingChange) => Deferred.succeed(started, change).pipe(Effect.andThen(Deferred.await(first))));
			changeSetting.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
			yield* mount(key);
			const flag = typeof next === "boolean";
			yield* settle(() => {
				if (flag) input().click();
				else {
					write(raw);
					document.querySelector("form")?.requestSubmit();
				}
			});
			expect(yield* Deferred.await(started)).toEqual({ key, value: next });
			expect(input().closest("fieldset")?.disabled).toBe(true);
			if (flag) expect(input().checked).toBe(true);
			else expect(input().value).toBe(raw);
			yield* settle(() => {
				Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Settings unavailable" })));
			});
			expect(document.querySelector('[role="alert"]')?.textContent).toContain("Settings unavailable");
			if (flag) expect(input().checked).toBe(true);
			else expect(input().value).toBe(raw);
			yield* settle(() => {
				if (flag) input().click();
				else document.querySelector("form")?.requestSubmit();
			});
			yield* Deferred.await(retried);
			yield* settle(() => {
				Effect.runSync(Deferred.succeed(second, saved(key, next)));
			});
			if (flag) expect(input().checked).toBe(false);
			else expect(input().value).toBe("6");
			expect(document.querySelector('[role="alert"]')).toBeNull();
			expect(document.body.textContent).toContain("Set by you.");
		}),
);
