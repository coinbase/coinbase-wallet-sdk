import crypto from "crypto"

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
