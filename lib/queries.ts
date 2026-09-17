import { getPrisma, hasDatabase } from "@/lib/prisma";

export async function getMeta() {
  if (!hasDatabase()) return null;
  return getPrisma().appMeta.findUnique({ where: { id: 1 } });
}
