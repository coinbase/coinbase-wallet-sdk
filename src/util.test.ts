import { hexStringToUint8Array, uint8ArrayToHex } from "./util";

const uint8ArrVal = new Uint8Array(6);

test("uint8ArrayToHex", () => {
  expect(uint8ArrayToHex(uint8ArrVal)).toEqual("000000000000");
});

test("hexStringToUint8Array", () => {
  expect(hexStringToUint8Array("9298119f5025")).toEqual(
    new Uint8Array([146, 152, 17, 159, 80, 37])
  );
});
