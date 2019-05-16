function chromeMain(): void {
  const { WALLETLINK_WEB_URL } = process.env

  const shouldntInject: boolean =
    (WALLETLINK_WEB_URL && location.origin.startsWith(WALLETLINK_WEB_URL)) ||
    (window.frameElement && window.frameElement.id === "__WalletLink__") ||
    document.documentElement!.hasAttribute("data-no-walletlink")

  if (shouldntInject) {
    return
  }

  const js: string = require("../build/walletlink.js")
  const container = document.head || document.documentElement!
  const s = document.createElement("script")
  s.textContent = `
    ${js}\n
    const walletLink = new WalletLink()
    window.web3 = walletLink.web3
    window.addEventListener("load", () => {
      walletLink.showWidget()
    }, false)
  `
  container.insertBefore(s, container.children[0])
}

chromeMain()
