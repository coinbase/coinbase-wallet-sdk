import "@testing-library/jest-dom";

import { Crypto } from "@peculiar/webcrypto";
// @ts-expect-error pragma is required in tests
import { h } from "preact";
import { TextDecoder, TextEncoder } from "util";

global.crypto = new Crypto();

global.TextEncoder = TextEncoder;

// @ts-expect-error Use util TextDecoder
global.TextDecoder = TextDecoder;
