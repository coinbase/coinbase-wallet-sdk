// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import crypto from "crypto"
import { fromEvent, Observable } from "rxjs"
import { filter, map } from "rxjs/operators"

const LOCAL_STORAGE_SESSION_ID_KEY = "SessionId"
const LOCAL_STORAGE_SESSION_SECRET_KEY = "SessionSecret"
const LOCAL_STORAGE_SESSION_LINKED_KEY = "SessionLinked"

export class Session {
  private readonly _id: string
  private readonly _secret: string
  private readonly _key: string
  private _linked: boolean

  constructor(id?: string, secret?: string, linked?: boolean) {
    this._id = id || crypto.randomBytes(16).toString("hex")
    this._secret = secret || crypto.randomBytes(32).toString("hex")
    this._key = crypto
      .createHash("sha256")
      .update(`${this._id}, ${this._secret} WalletLink`, "ascii")
      .digest("hex")
    this._linked = !!linked
  }

  public static load(): Session | null {
    const id = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY)
    const secret = localStorage.getItem(LOCAL_STORAGE_SESSION_SECRET_KEY)
    const linked = localStorage.getItem(LOCAL_STORAGE_SESSION_LINKED_KEY)
    if (id && secret) {
      return new Session(id, secret, linked === "1")
    }
    return null
  }

  public static clear(): void {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_ID_KEY)
    localStorage.removeItem(LOCAL_STORAGE_SESSION_SECRET_KEY)
    localStorage.removeItem(LOCAL_STORAGE_SESSION_LINKED_KEY)
  }

  public static get persistedSessionIdChange$(): Observable<{
    oldValue: string | null
    newValue: string | null
  }> {
    return fromEvent<StorageEvent>(window, "storage").pipe(
      filter(evt => evt.key === LOCAL_STORAGE_SESSION_ID_KEY),
      map(evt => ({
        oldValue: evt.oldValue || null,
        newValue: evt.newValue || null
      }))
    )
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
    localStorage.setItem(LOCAL_STORAGE_SESSION_ID_KEY, this._id)
    localStorage.setItem(LOCAL_STORAGE_SESSION_SECRET_KEY, this._secret)
    this.persistLinked()
    return this
  }

  private persistLinked(): void {
    localStorage.setItem(
      LOCAL_STORAGE_SESSION_LINKED_KEY,
      this._linked ? "1" : "0"
    )
  }
}
