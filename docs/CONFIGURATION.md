# Configuration Reference

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment mode |
| RPC_URL | Yes | - | Blockchain RPC endpoint |
| PRIVATE_KEY | Yes | - | Wallet private key |
| LOG_LEVEL | No | info | Logging verbosity |

## Config Files

### config.json
```json
{
  "network": "mainnet",
  "gasLimit": 500000,
  "timeout": 30000
}
```

## Runtime Options
Pass options via CLI or programmatically.

## Validation
Config is validated on startup. Invalid config throws errors.
