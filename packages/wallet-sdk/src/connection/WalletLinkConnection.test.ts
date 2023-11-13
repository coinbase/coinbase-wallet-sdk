import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { Session } from '../relay/Session';
import { WALLET_USER_NAME_KEY } from '../relay/WalletSDKRelayAbstract';
import { SessionConfig } from './SessionConfig';
import { WalletLinkConnection, WalletLinkConnectionUpdateListener } from './WalletLinkConnection';
import { WalletLinkConnectionCipher } from './WalletLinkConnectionCipher';
import { WalletLinkWebSocket } from './WalletLinkWebSocket';

describe('WalletLinkConnection', () => {
  const session = new Session(new ScopedLocalStorage('test'));
  const linkApiUrl = 'http://link-api-url';

  let connection: WalletLinkConnection;
  let websocket: WalletLinkWebSocket;
  let cipher: WalletLinkConnectionCipher;
  let listener: WalletLinkConnectionUpdateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new WalletLinkConnection(session, linkApiUrl, {
      linkedUpdated: jest.fn(),
      connectedUpdated: jest.fn(),
      handleResponseMessage: jest.fn(),
      chainUpdated: jest.fn(),
      accountUpdated: jest.fn(),
      metadataUpdated: jest.fn(),
      resetAndReload: jest.fn(),
    });
    websocket = (connection as any).ws;
    cipher = (connection as any).cipher;
    listener = (connection as any).listener;
  });

  it('should update metadata with setSessionConfigListener', async () => {
    const handleSessionConfigUpdatedSpy = jest.spyOn(
      connection as any,
      'handleSessionConfigUpdated'
    );

    const handleWalletUsernameUpdatedSpy = jest.spyOn(
      connection as any,
      'handleWalletUsernameUpdated'
    );

    const cipherDecryptSpy = jest
      .spyOn(cipher, 'decrypt')
      .mockImplementation((text) => Promise.resolve(`decrypted ${text}`));

    const listenerMetadataUpdatedSpy = jest.spyOn(listener, 'metadataUpdated');

    // simulate incoming session config

    const sessionConfig: SessionConfig = {
      webhookId: 'webhookId',
      webhookUrl: 'webhookUrl',
      metadata: {
        WalletUsername: 'new username',
      },
    };

    (websocket as any).incomingDataListener?.({
      ...sessionConfig,
      type: 'SessionConfigUpdated',
    });

    expect(handleSessionConfigUpdatedSpy).toHaveBeenCalledWith(sessionConfig.metadata);

    expect(handleWalletUsernameUpdatedSpy).toHaveBeenCalledWith(
      sessionConfig.metadata.WalletUsername
    );

    expect(cipherDecryptSpy).toHaveBeenCalledWith(sessionConfig.metadata.WalletUsername);

    const decrypted = await cipher.decrypt(sessionConfig.metadata.WalletUsername!);

    expect(listenerMetadataUpdatedSpy).toHaveBeenCalledWith(WALLET_USER_NAME_KEY, decrypted);
  });
});
