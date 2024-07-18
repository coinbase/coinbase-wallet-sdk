import ExpoModulesCore
import SafariServices

public class NativeCommunicatorModule: Module {
    public var currentSafariVC: SFSafariViewController?
    private var delegate: SafariViewControllerDelegateHandler = SafariViewControllerDelegateHandler()
    
    public func definition() -> ModuleDefinition {
        Name("NativeCommunicator")

        Events("onWalletClosed")
        
        AsyncFunction("openWalletWithUrl") { (url: String, promise: Promise) in
            guard let url = URL(string: url) else {
                promise.reject("E_INVALID_URL", "Invalid URL")
                return
            }
            
            let safariVC = SFSafariViewController(url: url)
            self.delegate.parentModule = self
            safariVC.delegate = delegate
            self.currentSafariVC = safariVC
            
            if #available(iOS 15.0, *) {
                if let sheet = safariVC.sheetPresentationController {
                    sheet.detents = [.large()]
                    sheet.prefersGrabberVisible = true
                }
            }
            
            if let windowScene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
               let rootVC = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
                rootVC.present(safariVC, animated: true, completion: {
                    promise.resolve(nil)
                })
            } else {
                promise.reject("E_NO_ROOT_VIEW_CONTROLLER", "No root view controller")
            }
        }.runOnQueue(.main)
        
        AsyncFunction("closeWallet") { (promise: Promise) in
            if let safariVC = self.currentSafariVC {
                safariVC.dismiss(animated: true) {
                    self.currentSafariVC = nil
                    promise.resolve(nil)
                }
            }
        }.runOnQueue(.main)
    }
}

class SafariViewControllerDelegateHandler: NSObject, SFSafariViewControllerDelegate {
    weak var parentModule: NativeCommunicatorModule?
    
    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        parentModule?.currentSafariVC = nil
        controller.dismiss(animated: true, completion: nil)
        parentModule?.sendEvent("onWalletClosed")
    }
}
