import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { type RoleDefault, RoleSettings } from "@antumbra/settings";
import { NodeServices } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { RoleSettingsOverRpc } from "#adapters/role-settings.ts";
import { ServerProcessLive } from "#adapters/server-process.ts";
import { ServerReachLive } from "#adapters/server-reach.ts";
import { isolatedTemp } from "#test/isolated.ts";

const temp = isolatedTemp();
const entry = fileURLToPath(import.meta.resolve("@antumbra/server/main.ts"));
const dataDirectory = (): string => mkdtempSync(join(temp, "antumbra-desktop-"));

const over = (directory: string) =>
	RoleSettingsOverRpc.pipe(
		Layer.provide(ServerReachLive),
		Layer.provide(Layer.provide(ServerProcessLive(entry, directory), NodeServices.layer)),
		Layer.provide(DomainFeedsLive),
	);

const captainOf = (defaults: ReadonlyArray<RoleDefault>): RoleDefault | undefined => defaults.find((row) => row.role === "captain");

it.live("answers every call over the socket the service keeps to the server it started", () =>
	Effect.gen(function* () {
		const settings = yield* RoleSettings;

		expect(captainOf(yield* settings.defaults())).toEqual({ backend: null, effort: null, model: null, role: "captain" });
		yield* settings.changeDefault("captain", { backend: "claude", effort: "high", model: "opus" });
		expect(captainOf(yield* settings.defaults())).toEqual({ backend: "claude", effort: "high", model: "opus", role: "captain" });
	}).pipe(Effect.provide(over(dataDirectory()))),
);
