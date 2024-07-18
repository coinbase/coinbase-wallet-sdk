package expo.modules.nativecommunicator

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeCommunicatorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeCommunicator")

    Events("onWalletClosed")
        
    AsyncFunction("openWalletWithUrl") { url: String, promise: Promise ->
      // TODO
    }.runOnQueue(Queues.MAIN)
        
    AsyncFunction("closeWallet") { promise: Promise ->
      // TODO
    }.runOnQueue(Queues.MAIN)
  }
}
