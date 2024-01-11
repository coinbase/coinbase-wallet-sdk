import crypto from 'crypto';

import { PopUpCommunicator } from './PopUpCommunicator';

const mockUUID = `e499350a-eb54-433e-bcbe-ef14aefebb4e`;
jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);

describe('PopUpCommunicator', () => {
  it('should connect and listen for ready event, and send request', async () => {
    const communicator = new PopUpCommunicator({ url: 'http://google.com' });
    jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), postMessage: jest.fn() } as any);
    const connectPromise = communicator.connect();

    const mockConnectEvent = new MessageEvent('message', {
      data: { message: 'popupReadyForRequest' },
      origin: 'http://google.com',
    });
    window.dispatchEvent(mockConnectEvent);

    await expect(connectPromise).resolves.toEqual(undefined);

    const sendPromise = communicator.send({ message: 'test' });

    const mockSendEvent = new MessageEvent('message', {
      data: { id: mockUUID, content: { requestId: mockUUID, content: 'data' } },
      origin: 'http://google.com',
    });
    window.dispatchEvent(mockSendEvent);

    await expect(sendPromise).resolves.toStrictEqual({
      id: mockUUID,
      content: { requestId: mockUUID, content: 'data' },
    });
  });

  it('should disconnect successfully', async () => {
    const communicator = new PopUpCommunicator({ url: 'http://google.com' });
    const closeMock = jest.fn();
    jest.spyOn(window, 'open').mockReturnValue({ focus: jest.fn(), close: closeMock } as any);
    const connectPromise = communicator.connect();

    const mockConnectEvent = new MessageEvent('message', {
      data: { message: 'popupReadyForRequest' },
      origin: 'http://google.com',
    });
    window.dispatchEvent(mockConnectEvent);

    await expect(connectPromise).resolves.toEqual(undefined);

    communicator.disconnect();

    expect(closeMock).toHaveBeenCalled();
  });
});
