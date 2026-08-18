import type { PayloadInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";

export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;
