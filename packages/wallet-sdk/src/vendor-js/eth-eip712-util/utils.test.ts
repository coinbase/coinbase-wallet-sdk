import { toBuffer } from './util';

describe('toBuffer', () => {
    it('should convert a BigInt to a Buffer', () => {
        const input = BigInt('12345678901234567890');
        
        // confirmed this is equal to (new BN(input)).toArrayLike(Buffer)
        const expectedOutput = Buffer.from(input.toString(16), 'hex');
        
        const result = toBuffer(input);
        expect(result).toEqual(expectedOutput);
    });
});
