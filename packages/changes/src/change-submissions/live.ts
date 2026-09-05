import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { Layer } from "effect";
import { ChangeRegistriesLive } from "#change-submissions/registries.ts";
import { Changes } from "#change-submissions/service.ts";

export const ChangesLive = (hosts: ReadonlyMap<string, ChangeHost>, runners: ReadonlyMap<string, Runner>) =>
	Changes.layer.pipe(Layer.provide(ChangeRegistriesLive(hosts, runners)));
