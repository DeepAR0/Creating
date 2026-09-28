import Capacitor
import GameKit
import UIKit

/// Uygulamaya özel yerel köprü: Game Center (liderlik tabloları, başarımlar) ve fotoğraf paylaşımı.
@objc(AquaNativePlugin)
public class AquaNativePlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "AquaNativePlugin"
    public let jsName = "AquaNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "gcSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "gcSubmitScores", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "gcReportAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "gcShow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)
    ]

    private var pendingSignIn: [CAPPluginCall] = []
    private var handlerInstalled = false

    // MARK: Game Center

    @objc func gcSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                call.resolve(["authenticated": true])
                return
            }
            self.pendingSignIn.append(call)
            if self.handlerInstalled { return }
            self.handlerInstalled = true
            // iOS bu işleyiciyi oturum durumu her değiştiğinde yeniden çağırır
            player.authenticateHandler = { [weak self] viewController, _ in
                guard let self = self else { return }
                if let vc = viewController {
                    self.bridge?.viewController?.present(vc, animated: true)
                    return
                }
                let ok = GKLocalPlayer.local.isAuthenticated
                let calls = self.pendingSignIn
                self.pendingSignIn.removeAll()
                calls.forEach { $0.resolve(["authenticated": ok]) }
                self.notifyListeners("gcAuth", data: ["authenticated": ok])
            }
        }
    }

    @objc func gcSubmitScores(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("not_authenticated")
            return
        }
        guard let scores = call.getArray("scores", JSObject.self) else {
            call.reject("invalid_arguments")
            return
        }
        let group = DispatchGroup()
        let lock = NSLock()
        var failure: Error?
        for item in scores {
            guard let id = item["id"] as? String, let value = (item["value"] as? NSNumber)?.intValue else { continue }
            group.enter()
            GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
                if let error = error {
                    lock.lock()
                    failure = error
                    lock.unlock()
                }
                group.leave()
            }
        }
        group.notify(queue: .main) {
            if let failure = failure {
                call.reject(failure.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func gcReportAchievements(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("not_authenticated")
            return
        }
        guard let list = call.getArray("achievements", JSObject.self) else {
            call.reject("invalid_arguments")
            return
        }
        let achievements: [GKAchievement] = list.compactMap { item in
            guard let id = item["id"] as? String else { return nil }
            let achievement = GKAchievement(identifier: id)
            achievement.percentComplete = min(100, max(0, (item["percent"] as? NSNumber)?.doubleValue ?? 100))
            achievement.showsCompletionBanner = true
            return achievement
        }
        if achievements.isEmpty {
            call.resolve()
            return
        }
        GKAchievement.report(achievements) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func gcShow(_ call: CAPPluginCall) {
        let view = call.getString("view") ?? "dashboard"
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.reject("not_authenticated")
                return
            }
            let state: GKGameCenterViewControllerState
            switch view {
            case "leaderboards": state = .leaderboards
            case "achievements": state = .achievements
            default: state = .dashboard
            }
            let vc = GKGameCenterViewController(state: state)
            vc.gameCenterDelegate = self
            self.bridge?.viewController?.present(vc, animated: true)
            call.resolve()
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }

    // MARK: Paylaşım

    @objc func shareImage(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              let data = Data(base64Encoded: base64),
              let image = UIImage(data: data) else {
            call.reject("invalid_image")
            return
        }
        let text = call.getString("text")
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("no_view")
                return
            }
            var items: [Any] = [image]
            if let text = text, !text.isEmpty { items.append(text) }
            let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let popover = vc.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                popover.permittedArrowDirections = []
            }
            vc.completionWithItemsHandler = { activity, completed, _, _ in
                call.resolve(["completed": completed, "activity": activity?.rawValue ?? ""])
            }
            presenter.present(vc, animated: true)
        }
    }
}
