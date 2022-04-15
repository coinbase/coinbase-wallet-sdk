import { randomBytesHex } from "./../src/util";

test("randomBytesHex", () => {
  expect(randomBytesHex(1234));
});
