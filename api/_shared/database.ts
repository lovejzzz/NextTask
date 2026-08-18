export function isMissingRpcFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || /could not find the function|does not exist/i.test(error.message ?? '');
}
