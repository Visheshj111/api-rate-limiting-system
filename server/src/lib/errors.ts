export function errorCause(error: any) {
  for (let depth = 0; error?.cause && depth < 5; depth++) error = error.cause;
  return error;
}
export const errorCode = (error: unknown) => errorCause(error)?.code;
