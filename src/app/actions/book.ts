"use server";

import { z } from "zod";
import { mutationSchema } from "@/lib/validation";
import type { ActionResult, BookData } from "@/lib/types";
import { requireAccountId } from "@/server/auth";
import { changeBook, readBook } from "@/server/books";
import { publicError } from "@/server/errors";

export async function loadBookAction(): Promise<ActionResult<BookData>> {
  try {
    const accountId = await requireAccountId();
    return { success: true, data: await readBook(accountId) };
  } catch (error) {
    return { success: false, error: publicError(error) };
  }
}

export async function mutateBookAction(
  input: unknown,
  revision: number,
): Promise<ActionResult<BookData>> {
  try {
    const accountId = await requireAccountId();
    const parsed = mutationSchema.safeParse(input);
    const parsedRevision = z.number().int().min(0).max(2_147_483_646).safeParse(revision);

    if (!parsed.success || !parsedRevision.success) {
      return {
        success: false,
        error: "Isian belum valid. Periksa nominal, tanggal, dan keterangan.",
      };
    }

    const data = await changeBook(accountId, parsedRevision.data, parsed.data);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: publicError(error) };
  }
}
