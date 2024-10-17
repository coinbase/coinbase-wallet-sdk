// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { randomBytesHex } from ':core/type/util.js';

const STORAGE_KEY_SESSION_ID = 'session:id';
const STORAGE_KEY_SESSION_SECRET = 'session:secret';
const STORAGE_KEY_SESSION_LINKED = 'session:linked';

export class WalletLinkSession {
  readonly key: string;
  private _linked: boolean;

  private constructor(
    readonly storage: ScopedLocalStorage,
    readonly id: string,
    readonly secret: string,
    linked = false
  ) {
    this.key = bytesToHex(sha256(`${id}, ${secret} WalletLink`));
    this._linked = !!linked;
  }

  public static create(storage: ScopedLocalStorage): WalletLinkSession {
    const id = randomBytesHex(16);
    const secret = randomBytesHex(32);
    return new WalletLinkSession(storage, id, secret).save();
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

  public get linked(): boolean {
    return this._linked;
  }

  public set linked(val: boolean) {
    this._linked = val;
    this.persistLinked();
  }

  public save(): WalletLinkSession {
    this.storage.setItem(STORAGE_KEY_SESSION_ID, this.id);
    this.storage.setItem(STORAGE_KEY_SESSION_SECRET, this.secret);
    this.persistLinked();
    return this;
  }

  private persistLinked(): void {
    this.storage.setItem(STORAGE_KEY_SESSION_LINKED, this._linked ? '1' : '0');
  }
}
