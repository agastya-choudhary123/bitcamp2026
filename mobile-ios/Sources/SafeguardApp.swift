import SwiftUI
import Auth0

@main
struct SafeguardApp: App {
    @AppStorage("isLoggedIn") private var isLoggedIn: Bool = false

    var body: some Scene {
        WindowGroup {
            if isLoggedIn {
                MainTabView()
                    .preferredColorScheme(.light) // Force clean white theme
                    .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("UserDidLogout"))) { _ in
                        isLoggedIn = false
                    }
            } else {
                LoginView()
                    .preferredColorScheme(.light) // Force clean white theme
                    .onAppear {
                        // Ensure token is cleared on landing here
                        NetworkManager.shared.accessToken = nil
                    }
            }
        }
    }
}
