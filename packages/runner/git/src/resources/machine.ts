import { Context, Effect } from "effect";
import type { RunnerFailure } from "#resources/model.ts";
export interface MachineShape {
	readonly join: (...paths: ReadonlyArray<string>) => string;
	readonly mirrorName: (slug: string, source: string) => string;
	readonly pathExists: (path: string) => Effect.Effect<boolean, RunnerFailure>;
	readonly ensureDirectory: (path: string) => Effect.Effect<void, RunnerFailure>;
	readonly canonicalPath: (path: string) => Effect.Effect<string, RunnerFailure>;
}
export class Machine extends Context.Service<Machine, MachineShape>()("@antumbra/runner-git/Machine") {}
export const pathExists = (path: string) => Effect.flatMap(Machine, (machine) => machine.pathExists(path));
export const ensureDirectory = (path: string) => Effect.flatMap(Machine, (machine) => machine.ensureDirectory(path));
export const canonicalPath = (path: string) => Effect.flatMap(Machine, (machine) => machine.canonicalPath(path));
