import { extending } from "@antumbra/platform-feature/extension.ts";
import { assemble } from "@antumbra/platform-rpc/group.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { boards, notes } from "#test/example.ts";

const ping = { payload: { id: Schema.String }, success: Schema.Void };

export const extension = extending(notes, RpcGroup.make(Rpc.make("tail", ping)));

export const extended: RpcGroup.RpcGroup<Rpc.Rpc<"notes.tail", Schema.Struct<{ id: typeof Schema.String }>>> = extension;

// @ts-expect-error a group extending a feature cannot reuse the name of one of that feature's commands or queries.
export const takenName = extending(notes, RpcGroup.make(Rpc.make("write", ping)));

export const assembled = assemble([notes, boards], extension, RpcGroup.make(Rpc.make("runner.tail", ping)));

// @ts-expect-error a hand-typed tag cannot sit on a procedure a feature already serves.
export const handTyped = assemble([notes, boards], RpcGroup.make(Rpc.make("notes.write", ping)));

// @ts-expect-error two hand-made groups cannot serve one tag.
export const repeated = assemble([notes], extension, RpcGroup.make(Rpc.make("notes.tail", ping)));

// @ts-expect-error two features cannot carry one name.
export const sameName = assemble([notes, notes], extension);
