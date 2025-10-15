import { z } from "zod";
import { HTTP_STATUS, HttpException } from "@danet/core";

/**
 * Validates data against a Zod schema and throws HTTP exception on validation error
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Validation error: ${errorMessages}`
      );
    }
    throw new HttpException(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid request data: ${error}`
    );
  }
}

/**
 * Safely validates data against a Zod schema and returns result with success flag
 */
export function safeValidateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return { success: false, error: errorMessages };
    }
    return { success: false, error: String(error) };
  }
}
