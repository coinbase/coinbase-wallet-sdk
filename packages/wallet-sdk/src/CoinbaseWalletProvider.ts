/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
// @ts-ignore
import { p256 } from "@noble/curves/p256";
const { startAuthentication } = require("@simplewebauthn/browser");
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import EventEmitter from "eventemitter3";
import {
  Address,
  bytesToBigInt,
  decodeAbiParameters,
  encodeAbiParameters,
  Hex,
  hexToBytes,
  parseAbiParameter,
  stringToHex,
  toHex,
  WalletGrantPermissionsParameters,
} from "viem";

import { standardErrorCodes, standardErrors } from "./core/error";
import { serializeError } from "./core/error/serialize";
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
  RequestArguments,
  Signer,
} from "./core/provider/interface";
import { AddressString, Chain, IntNumber } from "./core/type";
import {
  areAddressArraysEqual,
  hexStringFromIntNumber,
} from "./core/type/util";
import { AccountsUpdate, ChainUpdate } from "./sign/interface";
import {
  createSigner,
  fetchSignerType,
  loadSignerType,
  storeSignerType,
} from "./sign/util";
import {
  checkErrorForInvalidRequestArgs,
  fetchRPCRequest,
} from "./util/provider";
import { Communicator } from ":core/communicator/Communicator";
import { SignerType } from ":core/message";
import { determineMethodCategory } from ":core/provider/method";
import { ScopedLocalStorage } from ":util/ScopedLocalStorage";

const { createCredential } = require("webauthn-p256");

type BuildUserOperationParams = {
  authenticatorData: string;
  clientDataJSON: string;
  r: bigint;
  s: bigint;
};

const WebAuthnAuthStruct = {
  components: [
    {
      name: "authenticatorData",
      type: "bytes",
    },
    { name: "clientDataJSON", type: "bytes" },
    { name: "challengeIndex", type: "uint256" },
    { name: "typeIndex", type: "uint256" },
    {
      name: "r",
      type: "uint256",
    },
    {
      name: "s",
      type: "uint256",
    },
  ],
  name: "WebAuthnAuth",
  type: "tuple",
};

export function buildWebAuthnSignature({
  authenticatorData,
  clientDataJSON,
  r,
  s,
}: BuildUserOperationParams): Hex {
  const jsonClientDataUtf8 = isoBase64URL.toUTF8String(clientDataJSON);
  const challengeIndex = jsonClientDataUtf8.indexOf('"challenge":');
  const typeIndex = jsonClientDataUtf8.indexOf('"type":');

  const webAuthnAuthBytes = encodeAbiParameters(
    [WebAuthnAuthStruct],
    [
      {
        authenticatorData,
        clientDataJSON: stringToHex(jsonClientDataUtf8),
        challengeIndex,
        typeIndex,
        r,
        s,
      },
    ]
  );

  return webAuthnAuthBytes;
}

// adapted from Daimo
export function extractRSFromSig(base64Signature: string): {
  r: bigint;
  s: bigint;
} {
  // Create an ECDSA instance with the secp256r1 curve

  // Decode the signature from Base64
  const signatureDER = Buffer.from(base64Signature, "base64");
  const parsedSignature = p256.Signature.fromDER(signatureDER);
  const bSig = hexToBytes(`0x${parsedSignature.toCompactHex()}`);
  // assert(bSig.length === 64, "signature is not 64 bytes");
  const bR = bSig.slice(0, 32);
  const bS = bSig.slice(32);

  // Avoid malleability. Ensure low S (<= N/2 where N is the curve order)
  const r = bytesToBigInt(bR);
  let s = bytesToBigInt(bS);
  const n = BigInt(
    "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551"
  );
  if (s > n / BigInt(2)) {
    s = n - s;
  }
  return { r, s };
}

export async function signWithPasskey(base64Hash: string): Promise<Hex> {
  const options = await generateAuthenticationOptions({
    rpID: window.location.hostname,
    challenge: base64Hash,
    userVerification: "preferred",
  });
  options.challenge = base64Hash;

  const { response: sigResponse } = await startAuthentication(options);

  console.log(319, sigResponse);

  const authenticatorData = toHex(
    Buffer.from(sigResponse.authenticatorData, "base64")
  );

  const { r, s } = extractRSFromSig(sigResponse.signature);

  const signature = buildWebAuthnSignature({
    r,
    s,
    authenticatorData,
    clientDataJSON: sigResponse.clientDataJSON,
  });
  return signature;
}

type Session = {
  account: Address;
  approval: Hex;
  signer: Hex;
  permissionContract: Address;
  permissionData: Hex;
  expiry: number; // unix seconds
  chainId: bigint;
  verifyingContract: Address;
};

type UserOperation = {
  sender: Address;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: Hex;
};

export const sessionStruct = parseAbiParameter([
  "Session session",
  "struct Session { address account; uint256 chainId; bytes signer; uint40 expiry; address permissionContract; bytes permissionData; address verifyingContract; bytes approval; }",
]);

export function decodePermissionsContext(permissionsContext: Hex): {
  sessionManagerOwnerIndex: bigint;
  session: Session;
} {
  const [sessionManagerOwnerIndex, session] = decodeAbiParameters(
    [{ name: "sessionManagerOwnerIndex", type: "uint256" }, sessionStruct],
    permissionsContext
  );
  return { sessionManagerOwnerIndex, session };
}

// note this is for v0.6, our current Entrypoint version for CoinbaseSmartWallet
export const userOperationStruct = parseAbiParameter([
  "UserOperation userOperation",
  "struct UserOperation { address sender; uint256 nonce; bytes initCode; bytes callData; uint256 callGasLimit; uint256 verificationGasLimit; uint256 preVerificationGas; uint256 maxFeePerGas; uint256 maxPriorityFeePerGas; bytes paymasterAndData; bytes signature; }",
]);

const signatureWrapperStruct = parseAbiParameter([
  "SignatureWrapper signatureWrapper",
  "struct SignatureWrapper { uint256 ownerIndex; bytes signatureData; }",
]);

// wraps a signature with an ownerIndex for verification within CoinbaseSmartWallet
function wrapSignature({
  ownerIndex,
  signatureData,
}: {
  ownerIndex: bigint;
  signatureData: Hex;
}): Hex {
  return encodeAbiParameters([signatureWrapperStruct], [
    { ownerIndex, signatureData },
  ] as never);
}

function updateUserOpSignature({
  userOp,
  sessionManagerOwnerIndex,
  session,
  sessionKeySignature,
}: {
  userOp: UserOperation;
  sessionManagerOwnerIndex: bigint;
  session: Session;
  sessionKeySignature: Hex;
}): UserOperation {
  const requestData = encodeAbiParameters([userOperationStruct], [
    userOp,
  ] as never);
  const authData = encodeAbiParameters(
    [
      sessionStruct,
      { name: "signature", type: "bytes" },
      { name: "requestData", type: "bytes" },
    ],
    [session, sessionKeySignature, requestData] as never
  );

  const signature = wrapSignature({
    ownerIndex: sessionManagerOwnerIndex,
    signatureData: authData,
  });

  console.log("userOp.signature", signature);
  return {
    ...userOp,
    signature,
  };
}

export class CoinbaseWalletProvider
  extends EventEmitter
  implements ProviderInterface
{
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly communicator: Communicator;

  private signer: Signer | null;
  protected accounts: AddressString[] = [];
  protected chain: Chain;

  constructor({
    metadata,
    preference: { keysUrl, ...preference },
  }: Readonly<ConstructorOptions>) {
    super();
    this.metadata = metadata;
    this.preference = preference;
    this.communicator = new Communicator(keysUrl);
    this.chain = {
      id: metadata.appChainIds?.[0] ?? 1,
    };
    // Load states from storage
    const signerType = loadSignerType();
    this.signer = signerType ? this.initSigner(signerType) : null;
  }

  public get connected() {
    return this.accounts.length > 0;
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      const invalidArgsError = checkErrorForInvalidRequestArgs(args);
      if (invalidArgsError) throw invalidArgsError;
      // unrecognized methods are treated as fetch requests
      const category = determineMethodCategory(args.method) ?? "fetch";
      return this.handlers[category](args) as T;
    } catch (error) {
      return Promise.reject(serializeError(error, args.method));
    }
  }

  protected readonly handlers = {
    session: async (request: RequestArguments) => {
      const requestBody = {
        ...request,
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
      };
      const res = await window.fetch("http://localhost:3000/api/sendCalls", {
        method: "POST",
        body: JSON.stringify(requestBody),
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const response = await res.json();
      const { userOp, hash, base64Hash } = response.result;
      console.log("userOpHash", hash);
      console.log("base64 userOpHash", base64Hash);

      const signature = await signWithPasskey(base64Hash);
      console.log("passkey signature", signature);

      const { sessionManagerOwnerIndex, session } = decodePermissionsContext(
        (request.params as { capabilities: any }[])[0].capabilities.permissions
          .context
      );
      console.log(
        "decoded sessionManager ownerIndex",
        sessionManagerOwnerIndex
      );
      console.log("decoded session", session);

      const updatedOp = updateUserOpSignature({
        userOp,
        sessionKeySignature: signature,
        sessionManagerOwnerIndex,
        session,
      });

      console.log("updated userOp", updatedOp);

      const b = {
        method: "wallet_submitOp",
        params: { userOp: updatedOp },
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
      };
      await window.fetch("http://localhost:3000/api/sendCalls", {
        method: "POST",
        body: JSON.stringify(b),
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return hash; // should formally be a batchId, but userOpHash is sufficient for now
    },

    // eth_requestAccounts
    handshake: async (args: RequestArguments): Promise<any> => {
      try {
        if (this.connected) {
          this.emit("connect", {
            chainId: hexStringFromIntNumber(IntNumber(this.chain.id)),
          });
          return { addresses: this.accounts };
        }

        const requests = (args.params as { requests: any }).requests as (
          | {
              method: "wallet_grantPermissions";
              params: WalletGrantPermissionsParameters;
            }
          | { method: "personal_sign"; params: [Hex] }
        )[];
        const credential = await createCredential({ name: "[DEMO APP]" });
        console.log("new passkey credential", credential);

        const encodedPublicKey = encodeAbiParameters(
          [
            { name: "x", type: "uint256" },
            { name: "y", type: "uint256" },
          ],
          [credential.publicKey.x, credential.publicKey.y]
        );
        console.log("encodedPublicKey", encodedPublicKey);

        // @ts-ignore
        const updatedRequests = await Promise.all(
          requests.map(async (request) => {
            if (request.method === "wallet_grantPermissions") {
              if (request.params.signer?.type === "wallet") {
                return {
                  ...request,
                  params: {
                    ...request.params,
                    signer: {
                      type: "passkey",
                      data: {
                        publicKey: encodedPublicKey,
                        credentialId: credential.id,
                      },
                    },
                  },
                };
              }
            }
            return request;
          })
        );

        const signerType = await this.requestSignerSelection();
        const signer = this.initSigner(signerType);
        const accounts = await signer.handshake({ requests: updatedRequests });
        console.log("wallet_connect response", accounts);
        const grantPermissionsRes = accounts.requestResponses[1];
        console.log("grantPermissions inner response", grantPermissionsRes);
        const decodedContext = decodePermissionsContext(
          grantPermissionsRes.permissionsContext
        );
        console.log("received decodedContext", decodedContext);

        this.emit(
          "accountsChanged",
          (accounts as { addresses: any }).addresses
        );

        this.signer = signer;
        storeSignerType(signerType);

        this.emit("connect", {
          chainId: hexStringFromIntNumber(IntNumber(this.chain.id)),
        });
        return accounts;
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    sign: async (request: RequestArguments) => {
      if (!this.connected || !this.signer) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }
      try {
        return await this.signer.request(request);
      } catch (error) {
        this.handleUnauthorizedError(error);
        throw error;
      }
    },

    fetch: (request: RequestArguments) => fetchRPCRequest(request, this.chain),

    state: (request: RequestArguments) => {
      const getConnectedAccounts = (): AddressString[] => {
        if (this.connected) return this.accounts;
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      };
      switch (request.method) {
        case "eth_chainId":
          return hexStringFromIntNumber(IntNumber(this.chain.id));
        case "net_version":
          return this.chain.id;
        case "eth_accounts":
          return getConnectedAccounts();
        case "eth_coinbase":
          return getConnectedAccounts()[0];
        default:
          return this.handlers.unsupported(request);
      }
    },

    deprecated: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(
        `Method ${method} is deprecated.`
      );
    },

    unsupported: ({ method }: RequestArguments) => {
      throw standardErrors.rpc.methodNotSupported(
        `Method ${method} is not supported.`
      );
    },
  };

  private handleUnauthorizedError(error: unknown) {
    const e = error as { code?: number };
    if (e.code === standardErrorCodes.provider.unauthorized) this.disconnect();
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<unknown> {
    console.warn(
      `.enable() has been deprecated. Please use .request({ method: "eth_requestAccounts" }) instead.`
    );
    return await this.request({
      method: "ahhhhh",
    });
  }

  async disconnect(): Promise<void> {
    this.accounts = [];
    this.chain = { id: 1 };
    ScopedLocalStorage.clearAll();
    this.emit(
      "disconnect",
      standardErrors.provider.disconnected("User initiated disconnection")
    );
  }

  readonly isCoinbaseWallet = true;

  protected readonly updateListener = {
    onAccountsUpdate: ({ accounts, source }: AccountsUpdate) => {
      this.emit("accountsChanged", this.accounts);
      if (areAddressArraysEqual(this.accounts, accounts)) return;
      this.accounts = accounts;
      if (source === "storage") return;
    },
    onChainUpdate: ({ chain, source }: ChainUpdate) => {
      if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl)
        return;
      this.chain = chain;
      if (source === "storage") return;
      this.emit("chainChanged", hexStringFromIntNumber(IntNumber(chain.id)));
    },
  };

  private requestSignerSelection(): Promise<SignerType> {
    return fetchSignerType({
      communicator: this.communicator,
      preference: this.preference,
      metadata: this.metadata,
    });
  }

  private initSigner(signerType: SignerType): Signer {
    return createSigner({
      signerType,
      metadata: this.metadata,
      communicator: this.communicator,
      updateListener: this.updateListener,
    });
  }
}
