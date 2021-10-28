// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { fromEvent, Observable } from "rxjs"
import { filter, map } from "rxjs/operators"
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage"
import { randomBytesHex } from '../util';
import { sha256 } from 'js-sha256';

const STORAGE_KEY_SESSION_ID = "session:id"
const STORAGE_KEY_SESSION_SECRET = "session:secret"
const STORAGE_KEY_SESSION_LINKED = "session:linked"

export class Session {
  private readonly _id: string
  private readonly _secret: string
  private readonly _key: string
  private readonly _storage: ScopedLocalStorage
  private _linked: boolean

  constructor(
    storage: ScopedLocalStorage,
    id?: string,
    secret?: string,
    linked?: boolean
  ) {
    this._storage = storage
    this._id = id || randomBytesHex(16)
    this._secret = secret || randomBytesHex(32)

    const hash = sha256.create()
    hash.update(`${this._id}, ${this._secret} WalletLink`)
    this._key = hash.hex()

    this._linked = !!linked
  }

  public static load(storage: ScopedLocalStorage): Session | null {
    const id = storage.getItem(STORAGE_KEY_SESSION_ID)
    const linked = storage.getItem(STORAGE_KEY_SESSION_LINKED)
    const secret = storage.getItem(STORAGE_KEY_SESSION_SECRET)

    if (id && secret) {
      return new Session(storage, id, secret, linked === "1")
    }

    return null
  }

  public static clear(storage: ScopedLocalStorage): void {
    storage.removeItem(STORAGE_KEY_SESSION_SECRET)
    storage.removeItem(STORAGE_KEY_SESSION_ID)
    storage.removeItem(STORAGE_KEY_SESSION_LINKED)
  }

  public static get persistedSessionIdChange$(): Observable<{
    oldValue: string | null
    newValue: string | null
  }> {
    return fromEvent<StorageEvent>(window, "storage").pipe(
      filter(evt => evt.key === STORAGE_KEY_SESSION_ID),
      map(evt => ({
        oldValue: evt.oldValue || null,
        newValue: evt.newValue || null
      }))
    )
  }

  /**
   * Takes in a session ID and returns the sha256 hash of it.
   * @param sessionId session ID
   */
  public static hash(sessionId: string): string {
    const hash = sha256.create()
    return hash.update(sessionId).hex()
  }

  public get id(): string {
    return this._id
  }

  public get secret(): string {
    return this._secret
  }

  public get key(): string {
    return this._key
  }

  public get linked(): boolean {
    return this._linked
  }

  public set linked(val: boolean) {
    this._linked = val
    this.persistLinked()
  }

  public save(): Session {
    this._storage.setItem(STORAGE_KEY_SESSION_ID, this._id)
    this._storage.setItem(STORAGE_KEY_SESSION_SECRET, this._secret)
    this.persistLinked()
    return this
  }

  private persistLinked(): void {
    this._storage.setItem(STORAGE_KEY_SESSION_LINKED, this._linked ? "1" : "0")
  }
}
