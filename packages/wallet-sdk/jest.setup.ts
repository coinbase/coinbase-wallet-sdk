import '@testing-library/jest-dom';

import { Crypto } from '@peculiar/webcrypto';
import { TextDecoder, TextEncoder } from 'util';

global.crypto = new Crypto();

global.TextEncoder = TextEncoder;

global.TextDecoder = TextDecoder as typeof global.TextDecoder;
