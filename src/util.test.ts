import { uint8ArrayToHex } from "./util";

test("uint8ArrayToHex", () => {
  expect(uint8ArrayToHex(new Uint8Array(6))).toEqual("000000000000");
});
