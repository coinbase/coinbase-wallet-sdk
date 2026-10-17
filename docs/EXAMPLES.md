# Usage Examples

## Quick Start

### Basic Setup
```javascript
const sdk = require('package-name');
const client = sdk.initialize({ network: 'mainnet' });
```

### Send Transaction
```javascript
const tx = await client.sendTransaction({
  to: '0x...',
  value: '1000000000000000000'
});
console.log('TX Hash:', tx.hash);
```

### Query Data
```javascript
const balance = await client.getBalance(address);
console.log('Balance:', balance);
```

## Advanced Usage
See the full documentation for advanced patterns.
