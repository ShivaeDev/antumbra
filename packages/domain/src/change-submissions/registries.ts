import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { Context, Layer } from "effect";

export class ChangeHostRegistry extends Context.Service<
	ChangeHostRegistry,
	ReadonlyMap<string, ChangeHost>
>()("@antumbra/domain/ChangeHostRegistry") {}

export class RunnerRegistry extends Context.Service<
	RunnerRegistry,
	ReadonlyMap<string, Runner>
>()("@antumbra/domain/RunnerRegistry") {}

export const ChangeRegistriesLive = (
	hosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
) =>
	Layer.merge(
		Layer.succeed(ChangeHostRegistry)(hosts),
		Layer.succeed(RunnerRegistry)(runners),
	);
