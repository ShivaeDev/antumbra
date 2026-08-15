import {
	chmodSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";

// why: the real gh is replaced by a script rather than by a mock spawner,
// because what these tests check is the command line this package builds —
// argument order, flags, the query — and a mocked process layer would only
// assert the shape of our own call site back at us.
const SCRIPT = `#!/bin/sh
ROOT=$(dirname "$0")
for arg in "$@"; do printf '%s\\036' "$arg" >> "$ROOT/calls.log"; done
case "$1 $2" in
"auth status") ANSWER=auth ;;
"api graphql") ANSWER=graphql ;;
"pr create") ANSWER=create ;;
"pr view") ANSWER=view ;;
*) printf 'unscripted: %s\\n' "$*" >&2; exit 64 ;;
esac
if [ -f "$ROOT/$ANSWER.out" ]; then cat "$ROOT/$ANSWER.out"; fi
if [ -f "$ROOT/$ANSWER.err" ]; then cat "$ROOT/$ANSWER.err" >&2; fi
if [ -f "$ROOT/$ANSWER.code" ]; then exit "$(cat "$ROOT/$ANSWER.code")"; fi
exit 0
`;

export interface ScriptedAnswer {
	readonly code?: number;
	readonly err?: string;
	readonly out?: string;
}

export type ScriptedCall = "auth" | "create" | "graphql" | "view";

export interface ScriptedGh {
	readonly answer: (call: ScriptedCall, answer: ScriptedAnswer) => void;
	readonly executable: string;
	readonly received: () => ReadonlyArray<string>;
	readonly root: string;
}

const install = (root: string): ScriptedGh => {
	const executable = join(root, "gh");
	const log = join(root, "calls.log");
	writeFileSync(executable, SCRIPT);
	chmodSync(executable, 0o755);
	writeFileSync(log, "");
	return {
		answer: (call, answer) => {
			writeFileSync(join(root, `${call}.out`), answer.out ?? "");
			writeFileSync(join(root, `${call}.err`), answer.err ?? "");
			writeFileSync(join(root, `${call}.code`), String(answer.code ?? 0));
		},
		executable,
		// why: arguments are separated by a record separator rather than a
		// newline, because one of them is a multi-line pull request body and a
		// line-based log would report it as several arguments it never was.
		received: () =>
			readFileSync(log, "utf8")
				.split("\u001e")
				.filter((argument) => argument !== ""),
		root,
	};
};

export const scriptedGh = Effect.acquireRelease(
	Effect.sync(() => install(mkdtempSync(join(tmpdir(), "antumbra-gh-")))),
	(gh) => Effect.sync(() => rmSync(gh.root, { force: true, recursive: true })),
);

export const AUTHENTICATED: ScriptedAnswer = {
	out: "github.com\n  ✓ Logged in to github.com account skipper (keyring)\n  - Active account: true\n",
};

export const LOGGED_OUT: ScriptedAnswer = {
	code: 4,
	err: "You are not logged into any GitHub hosts. To log in, run: gh auth login\n",
};
