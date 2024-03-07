// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { sha256 } from 'sha.js';

import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { randomBytesHex } from ':core/util';

const STORAGE_KEY_SESSION_ID = 'session:id';
const STORAGE_KEY_SESSION_SECRET = 'session:secret';
const STORAGE_KEY_SESSION_LINKED = 'session:linked';

export class WalletLinkSession {
  private readonly _id: string;
  private readonly _secret: string;
  private readonly _key: string;
  private readonly _storage: ScopedLocalStorage;
  private _linked: boolean;

  constructor(storage: ScopedLocalStorage, id?: string, secret?: string, linked?: boolean) {
    this._storage = storage;
    this._id = id || randomBytesHex(16);
    this._secret = secret || randomBytesHex(32);

    this._key = new sha256()
      .update(`${this._id}, ${this._secret} WalletLink`) // ensure old sessions stay connected
      .digest('hex');

    this._linked = !!linked;
  }

  public static load(storage: ScopedLocalStorage): WalletLinkSession | null {
    const id = storage.getItem(STORAGE_KEY_SESSION_ID);
    const linked = storage.getItem(STORAGE_KEY_SESSION_LINKED);
    const secret = storage.getItem(STORAGE_KEY_SESSION_SECRET);

    if (id && secret) {
      return new WalletLinkSession(storage, id, secret, linked === '1');
    }

    return null;
  }

  /**
   * Takes in a session ID and returns the sha256 hash of it.
   * @param sessionId session ID
   */
  public static hash(sessionId: string): string {
    return new sha256().update(sessionId).digest('hex');
  }

  public get id(): string {
    return this._id;
  }

  public get secret(): string {
    return this._secret;
  }

  public get key(): string {
    return this._key;
  }

  public get linked(): boolean {
    return this._linked;
  }

  public set linked(val: boolean) {
    this._linked = val;
    this.persistLinked();
  }

  public save(): WalletLinkSession {
    this._storage.setItem(STORAGE_KEY_SESSION_ID, this._id);
    this._storage.setItem(STORAGE_KEY_SESSION_SECRET, this._secret);
    this.persistLinked();
    return this;
  }

  private persistLinked(): void {
    this._storage.setItem(STORAGE_KEY_SESSION_LINKED, this._linked ? '1' : '0');
  }
}
