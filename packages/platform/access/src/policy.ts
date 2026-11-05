import { permission } from "@shivaedev/access/permission.ts";
import { role } from "@shivaedev/access/role.ts";
import { roleSet } from "@shivaedev/access/roleSet.ts";
import { permissionMiddleware } from "@shivaedev/identity/permission.ts";

export const Manage = permission("antumbra.manage");
export const Execute = permission("antumbra.execute");
export const roles = roleSet(role("owner", [Manage, Execute]), role("runner", [Execute]));
export const owner = { id: "admiral", name: "Admiral", email: "admiral@antumbra.local", role: "owner" };
export class Owner extends permissionMiddleware<Owner>()("@antumbra/access/Owner", Manage) {}
export class Runner extends permissionMiddleware<Runner>()("@antumbra/access/Runner", Execute) {}
