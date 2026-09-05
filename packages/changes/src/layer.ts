import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { Layer } from "effect";
import { changeRegistriesLayer } from "#registries.ts";
import { Changes } from "#service.ts";

export const changesLayer = (hosts: ReadonlyMap<string, ChangeHost>, runners: ReadonlyMap<string, Runner>) =>
	Changes.layer.pipe(Layer.provide(changeRegistriesLayer(hosts, runners)));
