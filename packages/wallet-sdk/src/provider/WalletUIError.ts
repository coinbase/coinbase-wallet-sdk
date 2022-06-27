export class WalletUIError extends Error {
  private constructor(readonly message: string, readonly errorCode?: number) {
    super(message);
  }

  static UserRejectedRequest = new WalletUIError("User rejected request");

  static SwitchEthereumChainUnsupportedChainId = new WalletUIError(
    "Unsupported chainId",
    4902,
  );
}
