import { configureChains, defaultChains } from "wagmi";

import { infuraProvider } from 'wagmi/providers/infura'
import { publicProvider } from 'wagmi/providers/public'

import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

// API key for Ethereum node
// Two popular services are Infura (infura.io) and Alchemy (alchemy.com)
const infuraId = process.env.INFURA_ID;

// Configure chains for connectors to support
const { chains } = configureChains(defaultChains, [
    infuraProvider({ infuraId }),
    publicProvider(),
])

// Set up connectors
export const connectors = [
    new CoinbaseWalletConnector({
        chains,
        options: {
            appName: 'wagmi demo',
        },
    }),
    new WalletConnectConnector({
        chains,
        options: {
            infuraId,
            qrcode: true
        }
    }),
    new MetaMaskConnector({
        chains
    }),
];
