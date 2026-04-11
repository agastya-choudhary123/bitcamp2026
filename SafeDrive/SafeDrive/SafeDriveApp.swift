import SwiftUI

@main
struct SafeDriveApp: App {
    @AppStorage("isLoggedIn") private var isLoggedIn: Bool = false

    var body: some Scene {
        WindowGroup {
            if isLoggedIn {
                MainTabView()
                    .preferredColorScheme(.dark)
                    .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("UserDidLogout"))) { _ in
                        isLoggedIn = false
                    }
            } else {
                LoginView()
                    .preferredColorScheme(.dark)
            }
        }
    }
}
