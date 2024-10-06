export interface RelayUI {
  attach(): void;

  /**
   *
   * @param options onCancel callback for user clicking cancel,
   *  onResetConnection user clicked reset connection
   *
   * @returns callback that call can call to hide the connecting ui
   */
  showConnecting(options: {
    isUnlinkedErrorState?: boolean;
    onCancel: (error?: Error) => void;
    onResetConnection: () => void;
  }): () => void;
}
