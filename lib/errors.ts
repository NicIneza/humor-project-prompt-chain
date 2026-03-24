export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim() || "Something went wrong.";
  }

  if (typeof error === "string") {
    return error.trim() || "Something went wrong.";
  }

  return "Something went wrong.";
}
