export {};
declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowEIPError(code: number, message: string): R;
    }
  }
}
