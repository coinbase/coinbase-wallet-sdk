// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { randomBytesHex } from ':core/type/util';
import { ScopedStorage } from ':util/ScopedStorage';

const STORAGE_KEY_SESSION_ID = 'session:id';
const STORAGE_KEY_SESSION_SECRET = 'session:secret';
const STORAGE_KEY_SESSION_LINKED = 'session:linked';

export class WalletLinkSession {
  private readonly _id: string;
  private readonly _secret: string;
  private readonly _key: string;
  private readonly _storage: ScopedStorage;
  private _linked: boolean;

  constructor(storage: ScopedStorage, id?: string, secret?: string, linked?: boolean) {
    this._storage = storage;
    this._id = id || randomBytesHex(16);
    this._secret = secret || randomBytesHex(32);

    this._key = bytesToHex(sha256(`${this._id}, ${this._secret} WalletLink`));

    this._linked = !!linked;
  }

  public static load(storage: ScopedStorage): WalletLinkSession | null {
    const id = storage.getItem(STORAGE_KEY_SESSION_ID);
    const linked = storage.getItem(STORAGE_KEY_SESSION_LINKED);
    const secret = storage.getItem(STORAGE_KEY_SESSION_SECRET);

    if (id && secret) {
      return new WalletLinkSession(storage, id, secret, linked === '1');
    }

    return null;
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
