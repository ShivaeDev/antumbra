import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { Context, Layer } from "effect";

export class ChangeHostRegistry extends Context.Service<ChangeHostRegistry, ReadonlyMap<string, ChangeHost>>()(
	"@antumbra/changes/ChangeHostRegistry",
) {}

export class RunnerRegistry extends Context.Service<RunnerRegistry, ReadonlyMap<string, Runner>>()("@antumbra/changes/RunnerRegistry") {}

export const changeRegistriesLayer = (hosts: ReadonlyMap<string, ChangeHost>, runners: ReadonlyMap<string, Runner>) =>
	Layer.merge(Layer.succeed(ChangeHostRegistry)(hosts), Layer.succeed(RunnerRegistry)(runners));
