import { ethers } from "ethers";
import "./style.css";
import { fetchToken } from "./util";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `Connecting...`;

const IOS_UNIVERSAL_LINK = "http://localhost:3001"; // Using web schema for demo purposes
const ANDROID_DEEP_LINK = "pineapple://";
export const APP_NAME = "Pineapple Inc.";

const token = new URLSearchParams(window.location.search).get("token");

declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}

function isAndroid() {
  const isAndroidUserAgent = /(android)/i.test(navigator.userAgent);
  return isAndroidUserAgent;
}

async function signEthereum() {
  console.info("signEthereum");

  try {
    if (!token) {
      throw new Error("Not a valid user");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    const message = await fetchToken(token);
    const signature = await signer.signMessage(message);

    app.innerHTML = `Connected! Redirecting back...`;

    // Redirect URL with callback info
    if (isAndroid()) {
      // Handle if Android
      window.location.href = `${ANDROID_DEEP_LINK}/?address=${address}&sign=${signature}&message=${message}`;
    } else {
      // Handle if iOS
      window.location.href = `${IOS_UNIVERSAL_LINK}/?address=${address}&sign=${signature}&message=${message}`;
    }
  } catch (err) {
    // Display error state
    console.error(err);

    if (err instanceof Error) {
      app.innerHTML = `${err.message}. Redirecting back ...`;
    }

    // Go back to app
    setTimeout(() => window.history.back(), 800);
  }
}

async function handleEthereum() {
  console.info("handleEthereum");
  try {
    await window.ethereum.enable();
    console.info("enabled");

    setTimeout(signEthereum, 500);
  } catch (err) {
    console.error(err);
  }
}

function initListener() {
  console.info("initListener");
  window.addEventListener("ethereum#intialized", handleEthereum, {
    once: true,
  });

  setTimeout(handleEthereum, 5000); // 5 seconds
}

window.ethereum ? handleEthereum() : initListener();
