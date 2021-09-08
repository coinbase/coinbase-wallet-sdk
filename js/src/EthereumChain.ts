export enum EthereumChain {
  // mainnets
  ETHEREUM_MAINNET = 1,
  OPTIMISM_MAINNET =10,
  POLYGON_MAINNET = 137,
  ETHEREUM_CLASSIC_MAINNET = 61,
  BSC_MAINNET = 56,
  FANTOM_MAINNET = 250,
  ARBITRUM_MAINNET = 42161,
  XDAI_MAINNET = 100,
  AVALANCHE_MAINNET = 43114,

  // testnets
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  KOVAN = 42,
  OPTIMISM_KOVAN = 69,
  POLYGON_TESTNET = 80001,
  BSC_TESTNET = 97,
  FANTOM_TESTNET = 4002,
  ARBITRUM_TESTNET = 421611,
  AVALANCHE_FUJI = 43113,
}

export namespace EthereumChain {
  export function rpcUrl(thiz: EthereumChain): string | undefined {
    switch(thiz) {
      case EthereumChain.ETHEREUM_MAINNET : return "https://mainnet-infura.wallet.coinbase.com"
      case EthereumChain.ROPSTEN : return "https://ropsten-infura.wallet.coinbase.com"
      case EthereumChain.RINKEBY : return "https://rinkeby-infura.wallet.coinbase.com"
      case EthereumChain.KOVAN : return "https://kovan-infura.wallet.coinbase.com"
      case EthereumChain.GOERLI : return "https://goerli-node.wallet.coinbase.com"
      case EthereumChain.OPTIMISM_KOVAN : return "https://optimism-node.wallet.coinbase.com"
      case EthereumChain.OPTIMISM_MAINNET : return "https://optimism-mainnet.wallet.coinbase.com"
      case EthereumChain.POLYGON_MAINNET : return "https://polygon-mainnet-infura.wallet.coinbase.com"
      case EthereumChain.POLYGON_TESTNET : return "https://polygon-mumbai-infura.wallet.coinbase.com"
      case EthereumChain.BSC_MAINNET : return "https://bsc-dataseed.binance.org"
      case EthereumChain.BSC_TESTNET : return "https://data-seed-prebsc-1-s1.binance.org:8545"
      case EthereumChain.FANTOM_MAINNET: return "https://rpcapi.fantom.network"
      case EthereumChain.FANTOM_TESTNET: return "https://rpc.testnet.fantom.network"
      case EthereumChain.ARBITRUM_MAINNET: return "https://l2-mainnet.wallet.coinbase.com?targetName=arbitrum"
      case EthereumChain.ARBITRUM_TESTNET: return "https://rinkeby.arbitrum.io/rpc"
      case EthereumChain.XDAI_MAINNET: return "https://rpc.xdaichain.com"
      case EthereumChain.AVALANCHE_MAINNET: return "https://api.avax.network/ext/bc/C/rpc"
      case EthereumChain.AVALANCHE_FUJI: return "https://api.avax-test.network/ext/bc/C/rpc"
      default: return undefined
    }
  }

  export function fromChainId(chainId: bigint): EthereumChain | undefined {
    switch(Number(chainId)) {
      // mainnets
      case EthereumChain.ETHEREUM_MAINNET.valueOf() : return EthereumChain.ETHEREUM_MAINNET
      case EthereumChain.OPTIMISM_MAINNET.valueOf() : return EthereumChain.OPTIMISM_MAINNET
      case EthereumChain.POLYGON_MAINNET.valueOf() : return EthereumChain.POLYGON_MAINNET
      case EthereumChain.ETHEREUM_CLASSIC_MAINNET.valueOf() : return EthereumChain.ETHEREUM_CLASSIC_MAINNET
      case EthereumChain.BSC_MAINNET.valueOf() : return EthereumChain.BSC_MAINNET
      case EthereumChain.FANTOM_MAINNET.valueOf() : return EthereumChain.FANTOM_MAINNET
      case EthereumChain.ARBITRUM_MAINNET.valueOf() : return EthereumChain.ARBITRUM_MAINNET
      case EthereumChain.AVALANCHE_MAINNET.valueOf() : return EthereumChain.AVALANCHE_MAINNET
      case EthereumChain.XDAI_MAINNET.valueOf() : return EthereumChain.XDAI_MAINNET

      // testnets
      case EthereumChain.ROPSTEN.valueOf() : return EthereumChain.ROPSTEN
      case EthereumChain.RINKEBY.valueOf() : return EthereumChain.RINKEBY
      case EthereumChain.GOERLI.valueOf() : return EthereumChain.GOERLI
      case EthereumChain.KOVAN.valueOf() : return EthereumChain.KOVAN
      case EthereumChain.OPTIMISM_KOVAN.valueOf() : return EthereumChain.OPTIMISM_KOVAN
      case EthereumChain.POLYGON_TESTNET.valueOf() : return EthereumChain.POLYGON_TESTNET
      case EthereumChain.BSC_TESTNET.valueOf() : return EthereumChain.BSC_TESTNET
      case EthereumChain.FANTOM_TESTNET.valueOf() : return EthereumChain.FANTOM_TESTNET
      case EthereumChain.ARBITRUM_TESTNET.valueOf() : return EthereumChain.ARBITRUM_TESTNET
      case EthereumChain.AVALANCHE_FUJI.valueOf() : return EthereumChain.AVALANCHE_FUJI
      default: return undefined
    }
  }
}