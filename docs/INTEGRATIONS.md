# Integration Guide

## Overview
This guide covers integrating with third-party services and protocols.

## Supported Integrations
- Ethereum JSON-RPC providers
- IPFS/Arweave storage
- The Graph indexing
- Chainlink oracles

## Configuration
Set environment variables for each integration:

```bash
RPC_URL=https://...
IPFS_GATEWAY=https://...
GRAPH_API_KEY=...
```

## Best Practices
- Use fallback providers
- Implement retry logic
- Cache responses when possible
