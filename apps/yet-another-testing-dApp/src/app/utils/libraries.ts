export const LIBRARIES: Library[] = [
  {
    name: "coinbase-wallet-sdk",
    version: "3.7.1",
    url: "https://github.com/coinbase/coinbase-wallet-sdk",
  },
  {
    name: "wagmi",
    version: "1.3.9",
    url: "https://github.com/wagmi-dev/wagmi",
  },
  {
    name: "rainbowkit",
    version: "1.0.7",
    url: "https://github.com/rainbow-me/rainbowkit",
    subtext: "(wagmi)",
  },
  {
    name: "web3modal",
    version: "2.7.1",
    url: "https://github.com/WalletConnect/web3modal",
    subtext: "(wagmi)",
  },
  {
    name: "web3-react",
    version: "8.2.0",
    url: "https://github.com/Uniswap/web3-react",
  },
  {
    name: "web3-onboard",
    version: "2.24.4",
    url: "https://github.com/blocknative/web3-onboard",
  },
  {
    name: "thirdweb",
    version: "1.1.1",
    url: "https://github.com/thirdweb-dev/js/",
  },
];

export type Library = {
  name: string;
  version: string | null;
  url: string | null;
  subtext?: string;
};
