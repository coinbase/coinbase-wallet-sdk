"use client";

import { useRouter } from "next/navigation";

function RedirectIndex() {
  const router = useRouter();
  // Make sure we're in the browser
  if (typeof window !== "undefined") {
    router.push("/libraries/coinbase-wallet-sdk");
  }

  return <></>;
}

export default RedirectIndex;
