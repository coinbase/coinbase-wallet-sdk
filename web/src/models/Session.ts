import crypto from "crypto"
import { fromEvent, Observable } from "rxjs"
import { filter, map } from "rxjs/operators"

const localStorageSessionIdKey = "WalletLinkSessionId"
const localStorageSessionSecretKey = "WalletLinkSessionSecret"

export class Session {
  private readonly _id: string
  private readonly _secret: string
  private readonly _key: string

  constructor(id?: string, secret?: string) {
    this._id = id || crypto.randomBytes(16).toString("hex")
    this._secret = secret || crypto.randomBytes(32).toString("hex")
    this._key = crypto
      .createHash("sha256")
      .update(`${this._id}, ${this._secret} WalletLink`, "ascii")
      .digest("hex")
  }

  public static load(): Session | null {
    const id = localStorage.getItem(localStorageSessionIdKey)
    const secret = localStorage.getItem(localStorageSessionSecretKey)
    if (id && secret) {
      return new Session(id, secret)
    }
    return null
  }

  public static clear(): void {
    localStorage.removeItem(localStorageSessionIdKey)
    localStorage.removeItem(localStorageSessionSecretKey)
  }

  public static get sessionIdChange$(): Observable<{
    oldValue: string | null
    newValue: string | null
  }> {
    return fromEvent<StorageEvent>(window, "storage").pipe(
      filter(evt => evt.key === localStorageSessionIdKey),
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

  public save(): Session {
    localStorage.setItem(localStorageSessionIdKey, this.id)
    localStorage.setItem(localStorageSessionSecretKey, this.secret)
    return this
  }
}
