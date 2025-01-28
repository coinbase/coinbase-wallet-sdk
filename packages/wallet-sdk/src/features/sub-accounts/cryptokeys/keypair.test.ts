import { generateSubAccountKeypair } from './keypair.js';

describe('keypair', () => {
  it('should generate a keypair', async () => {
    const keypair = await generateSubAccountKeypair();
    expect(keypair).toBeDefined();
  });
});
