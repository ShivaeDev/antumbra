import { Result } from "effect";
import { type Lifecycle, type Observation, observationFrom } from "#pr/observation.ts";

export const usage = "usage: pnpm pr watch <pull request url or number> [--until end|ci]";

export type Until = "ci" | "end";

export type Command = { readonly spec: string; readonly until: Until };

export const parseCommand = (args: readonly string[]): Result.Result<Command, string> => {
	const [verb, spec, flag, value] = args;
	if (verb !== "watch" || spec === undefined || spec.startsWith("-")) return Result.fail(usage);
	if (args.length === 2) return Result.succeed({ spec, until: "end" });
	if (args.length === 4 && flag === "--until" && (value === "ci" || value === "end")) return Result.succeed({ spec, until: value });
	return Result.fail(usage);
};

export type Line =
	| { readonly state: "changes-requested" | "ci-green" | "closed" | "conflict" | "merged" | "superseded"; readonly head: string }
	| { readonly state: "ci-failed"; readonly head: string; readonly checks: readonly string[] }
	| { readonly state: "gh-error"; readonly message: string };

export const render = (line: Line): string => JSON.stringify(line);

export type Watch = {
	readonly armed: string | undefined;
	readonly changesRequested: boolean;
	readonly conflict: boolean;
	readonly error: string | undefined;
	readonly failureReported: string | undefined;
	readonly lifecycle: Lifecycle;
};

export type Step = { readonly exit: number | undefined; readonly lines: readonly Line[]; readonly watch: Watch };

export const initial: Watch = {
	armed: undefined,
	changesRequested: false,
	conflict: false,
	error: undefined,
	failureReported: undefined,
	lifecycle: "open",
};

const ending = (watch: Watch, observation: Observation): readonly Line[] => {
	if (observation.lifecycle === "open" || observation.lifecycle === watch.lifecycle) return [];
	return [{ state: observation.lifecycle, head: observation.head }];
};

const settled = (until: Until, armed: string, observation: Observation): number | undefined => {
	if (until === "end") return observation.lifecycle === "open" ? undefined : 0;
	if (observation.head !== armed) return 4;
	if (observation.ci === "green") return 0;
	if (observation.ci === "failed") return 1;
	return undefined;
};

const verdict = (exit: number | undefined, observation: Observation): readonly Line[] => {
	if (exit === 0) return [{ state: "ci-green", head: observation.head }];
	if (exit === 4) return [{ state: "superseded", head: observation.head }];
	return [];
};

export const advance = (watch: Watch, until: Until, observation: Observation): Step => {
	const armed = watch.armed ?? observation.head;
	const conflict = observation.conflict ?? watch.conflict;
	const failing = observation.ci === "failed" && watch.failureReported !== observation.head;
	const exit = settled(until, armed, observation);
	return {
		exit,
		lines: [
			...(failing ? [{ state: "ci-failed" as const, head: observation.head, checks: observation.failed }] : []),
			...(conflict && !watch.conflict ? [{ state: "conflict" as const, head: observation.head }] : []),
			...(observation.changesRequested && !watch.changesRequested ? [{ state: "changes-requested" as const, head: observation.head }] : []),
			...ending(watch, observation),
			...(until === "ci" ? verdict(exit, observation) : []),
		],
		watch: {
			armed,
			changesRequested: observation.changesRequested,
			conflict,
			error: undefined,
			failureReported: failing ? observation.head : watch.failureReported,
			lifecycle: observation.lifecycle,
		},
	};
};

const unreachable = (watch: Watch, message: string): Step => ({
	exit: undefined,
	lines: watch.error === message ? [] : [{ state: "gh-error", message }],
	watch: { ...watch, error: message },
});

export const step = (watch: Watch, until: Until, outcome: Result.Result<string, string>): Step =>
	Result.match(Result.flatMap(outcome, observationFrom), {
		onFailure: (message) => unreachable(watch, message),
		onSuccess: (observation) => advance(watch, until, observation),
	});
