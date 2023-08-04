export interface SerializedEthereumRpcError extends Error {
  code: number;
  message: string;
  data?: unknown;
  stack?: string;
}

export const stringifyResults = (value?: string | Object | any) => {
  if (typeof value === "string") {
    console.log("results: ", value);
    return value;
  }
  if (typeof value === "object") {
    console.log("results: ", value);
    let cache: any[] = [];
    let str = JSON.stringify(value, function (_, value) {
      if (typeof value === "object" && value !== null) {
        if (cache?.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = []; // reset the cache
    return str;
  }
  if (value instanceof Error) {
    const error = value as Error;
    console.error(error);
    return `
      name: ${error.name}
      message: ${error.message}
      stack: ${error.stack}
    `;
  }

  return "";
};
