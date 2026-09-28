import Capacitor
import UIKit

/// Uygulamanın kendi yerel eklentilerini köprüye kaydeder.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AquaNativePlugin())
    }
}
