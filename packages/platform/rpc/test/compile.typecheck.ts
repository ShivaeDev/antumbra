import { feature } from "@antumbra/platform-feature/feature.ts";
import { assemble } from "@antumbra/platform-rpc/group.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { boards, notes } from "#test/example.ts";

const ping = { payload: Schema.Struct({}), success: Schema.Void };

const restart = RpcGroup.make(Rpc.make("restart.drain", ping));

export const sound = assemble([notes, boards], restart, RpcGroup.make(Rpc.make("runner.append", ping)));

// @ts-expect-error a hand-made tag never sits inside a feature's namespace, colliding or not.
export const trespassing = assemble([notes, boards], restart, RpcGroup.make(Rpc.make("notes.other", ping)));

// @ts-expect-error two hand-made groups never serve the same tag.
export const repeated = assemble([notes], restart, RpcGroup.make(Rpc.make("restart.drain", ping)));

const notesAgain = feature("notes", { rows: [], facts: [], commands: [], materializers: [], queries: [] });

// @ts-expect-error two features never carry the same name.
export const twice = assemble([notes, notesAgain], restart);
