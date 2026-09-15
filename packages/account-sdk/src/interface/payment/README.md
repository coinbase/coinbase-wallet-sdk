# Payment Interface

The payment interface provides a simple way to make USDC payments on Base network using an ephemeral wallet.

## Basic Usage

```typescript
import { pay } from '@coinbase/wallet-sdk';

try {
  const payment = await pay({
    amount: "10.50",
    to: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51",
    dataSuffix: "0xabc123",
    testnet: true
  });

  console.info(`Payment sent! Transaction ID: ${payment.id}`);
} catch (error) {
  console.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

## Checking Payment Status

You can check the status of a payment using the transaction ID returned from the pay function:

```typescript
import { getPaymentStatus } from '@coinbase/wallet-sdk';

// Check payment status
const status = await getPaymentStatus({
  id: payment.id,
  expectedPayment: {
    amount: "10.50",
    recipient: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51"
  },
  testnet: true
});

switch (status.status) {
  case 'pending':
    console.log('Payment is still being processed...');
    break;
  case 'completed':
    console.log(`Payment completed! Amount: ${status.amount} to ${status.recipient}`);
    break;
  case 'failed':
    console.log(`Payment failed: ${status.reason}`);
    break;
  case 'not_found':
    console.log('Payment not found');
    break;
}
```

Use trusted server-side order values for `expectedPayment`. It is optional for backward
compatibility, but omitting it only verifies that the operation contained a positive USDC transfer;
it does not verify the order amount or recipient. Bind each payment ID to one order and reject IDs
that have already been used for fulfillment.

### Production Verification

- Call `getPaymentStatus()` on your backend before fulfilling an order.
- Load `expectedPayment.amount` and `expectedPayment.recipient` from your server-side order record;
  never accept these values from the payer.
- Store the payment ID with the fulfilled order and reject an ID that has already been consumed.
- Handle verification errors with `try/catch`. A returned `failed` status means the on-chain
  operation failed; invalid or mismatched payment evidence throws instead.
- Treat the returned `amount` as a normalized display value. Verification compares exact on-chain
  USDC units rather than formatted strings.

## Information Requests (Data Callbacks)

You can request additional information from the user during payment using the `payerInfo` parameter:

```typescript
import { pay } from '@coinbase/wallet-sdk';

const payment = await pay({
  amount: "10.50",
  to: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51",
  testnet: true,
  payerInfo: {
    requests: [
      { type: 'email' },
      { type: 'physicalAddress', optional: true },
      { type: 'phoneNumber', optional: false },
      { type: 'name', optional: true },
      { type: 'onchainAddress' },
    ],
    callbackURL: 'https://example.com/callback'
  }
});
```

### Supported Information Types

- `email` - User's email address
- `physicalAddress` - User's physical address
- `phoneNumber` - User's phone number
- `name` - User's full name
- `onchainAddress` - User's on-chain address

### Optional vs Required

By default, all information requests are required (`optional: false`). You can make a request optional by setting `optional: true`.

### Callback URL

The `callbackURL` specifies where the collected user information will be sent after the payment is completed.

## Telemetry

Both `pay()` and `getPaymentStatus()` functions log telemetry events by default to help with monitoring and debugging. You can opt out of telemetry by setting the `telemetry` parameter to `false`:

```typescript
// Disable telemetry for payment
const payment = await pay({
  amount: "10.50",
  to: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51",
  testnet: true,
  telemetry: false  // Opt out of telemetry
});

// Disable telemetry for status check
const status = await getPaymentStatus({
  id: payment.id,
  expectedPayment: {
    amount: "10.50",
    recipient: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51"
  },
  testnet: true,
  telemetry: false  // Opt out of telemetry
});
```

## API Reference

### `pay(options: PaymentOptions): Promise<PaymentResult>`

#### PaymentOptions

- `amount: string` - Amount of USDC to send as a string (e.g., "10.50")
- `to: string` - Ethereum address to send payment to
- `dataSuffix?: Hex` - Optional attribution data suffix as 0x-prefixed hex (viem `Hex` type)
- `testnet?: boolean` - Whether to use Base Sepolia testnet (default: false)
- `payerInfo?: PayerInfo` - Optional payer information configuration for data callbacks
- `telemetry?: boolean` - Whether to enable telemetry logging (default: true)

#### PayerInfo

- `requests: InfoRequest[]` - Array of information requests
- `callbackURL?: string` - Optional URL where the collected information will be sent

#### InfoRequest

- `type: string` - The type of information being requested
- `optional?: boolean` - Whether the information is optional (default: false)

#### PaymentResult

The payment result is always a successful payment (errors are thrown as exceptions):
- `success: true` - Indicates successful payment
- `id: string` - Transaction hash
- `amount: string` - Amount sent in USDC
- `to: Address` - Recipient address
- `payerInfoResponses?: PayerInfoResponses` - Responses from information requests (if any)

### `getPaymentStatus(options: PaymentStatusOptions): Promise<PaymentStatus>`

#### PaymentStatusOptions

- `id: string` - Transaction ID (userOp hash) to check status for
- `expectedPayment?: { amount: string; recipient: Address }` - Trusted order details to verify
  against the on-chain USDC transfer; `amount` must be positive with at most 6 decimal places
- `testnet?: boolean` - Whether to check on testnet (Base Sepolia). Defaults to false (mainnet)
- `telemetry?: boolean` - Whether to enable telemetry logging (default: true)
- `bundlerUrl?: string` - Trusted custom bundler URL for status checks

#### PaymentStatus

- `status: 'pending' | 'completed' | 'failed' | 'not_found'` - Current status of the payment
- `id: string` - Transaction ID that was checked
- `message: string` - Human-readable message about the status
- `sender?: string` - Sender address (present for pending, completed, and failed)
- `amount?: string` - Amount sent (present for completed transactions, parsed from logs)
- `recipient?: string` - Recipient address (present for completed transactions, parsed from logs)
- `reason?: string` - On-chain failure reason (present for failed status)