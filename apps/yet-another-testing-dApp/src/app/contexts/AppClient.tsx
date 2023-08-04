"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fromHex } from "viem";

import { isClient } from "@/app/utils/isClient";
import { LIBRARIES, Library } from "@/app/utils/libraries";
import { coinbaseProvider, windowEthereum } from "@/app/utils/windowEthereum";

type TAppContext = {
  account: string;
  library: Library;
  connected?: string;
  chainId?: string;
  showHidden?: boolean;
  activePage?: string;
};

const [walletSDK] = LIBRARIES;

export const AppContext = createContext<TAppContext>({
  account: "",
  library: walletSDK,
  connected: undefined,
  chainId: undefined,
  showHidden: false,
  activePage: "wallet-libraries",
});

export const AppDispatchContext = createContext<{
  selectLibrary: (library: Library) => void;
  setConnected: (connectedLibrary: string) => void;
  setChainId: (id: string) => void;
  setShowHidden: (val: boolean) => void;
  setActivePage: (page: string) => void;
}>({
  selectLibrary: () => {},
  setConnected: () => {},
  setChainId: () => {},
  setShowHidden: (val) => {},
  setActivePage: (page) => {},
});

type AppProps = {
  children: ReactNode;
};

if (isClient && windowEthereum) {
  windowEthereum.on("accountsChanged", (accounts: string[]) => {
    console.log("accountsChanged: ", accounts);
  });

  windowEthereum.on("chainChanged", (chainId: string) => {
    console.log("chainChanged: ", chainId);
  });

  windowEthereum.on("connect", (connectInfo: { chainId: string }) => {
    console.log("connect: ", connectInfo);
  });

  windowEthereum.on("disconnect", (error: { code: number; message: string }) => {
    console.log("disconnect: ", error);
  });
}
export function AppProvider({ children }: AppProps) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [library, setLibrary] = useState<Library>(walletSDK);
  const [connected, setConnected] = useState<string | undefined>(undefined);
  const [showHidden, setShowHidden] = useState(false);
  const [activePage, setActivePage] = useState("wallet-libraries");

  const setConnectedLibrary = useCallback((connectedLibrary: string) => {
    setConnected(connectedLibrary);
    setAccount(connectedLibrary ? coinbaseProvider?.selectedAddress! : "");
    setChainId(fromHex(coinbaseProvider?.chainId as `0x${string}`, "number").toString());
  }, []);

  useEffect(() => {
    const setupConnectedLibrary = () => {
      if (windowEthereum) {
        if (coinbaseProvider?.selectedAddress) {
          let walletMsg = "Injected Provider";

          if (coinbaseProvider?.isCoinbaseWallet) {
            walletMsg += ": Coinbase Wallet";
          }

          if (coinbaseProvider?.isMetaMask) {
            walletMsg += ": MetaMask";
          }

          setConnected(walletMsg);
          setAccount(coinbaseProvider?.selectedAddress);
          setChainId(fromHex(coinbaseProvider?.chainId as `0x${string}`, "number").toString());
        }
      }
    };

    setupConnectedLibrary();
  }, []);

  const selectLibrary = useCallback((value: Library) => {
    setLibrary(value);
  }, []);

  const walletValue = useMemo(
    () => ({ account, library, connected, chainId, showHidden, activePage }),
    [account, library, connected, chainId, showHidden, activePage],
  );

  const dispatchValue = useMemo(
    () => ({
      selectLibrary,
      setConnected: setConnectedLibrary,
      setChainId,
      setShowHidden,
      setActivePage,
    }),
    [selectLibrary, setConnectedLibrary, setShowHidden],
  );

  return (
    <AppContext.Provider value={walletValue}>
      <AppDispatchContext.Provider value={dispatchValue}>{children}</AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const walletContext = useContext(AppContext);
  const dispatchContext = useContext(AppDispatchContext);

  return {
    ...walletContext,
    ...dispatchContext,
  };
}
