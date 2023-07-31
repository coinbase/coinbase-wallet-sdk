// This is not ideal. ts should pick up custom matchers from the jest.setup.ts file
// but it doesn't. So we have to declare them here.
export {};
declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowEIPError(code: number, message: string): R;
    }
  }
}
