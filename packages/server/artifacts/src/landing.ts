import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { Schema } from "effect";

const { digest: _digest, byteSize: _byteSize, ...fields } = land.Input.fields;
export const Landing = Schema.Struct({ ...fields, bytes: Schema.Uint8Array });
