import SwiftUI
import Auth0

@main
struct SafeguardApp: App {
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
                    .onAppear {
                        // Clear any stale token on logout
                        NetworkManager.shared.accessToken = nil
                    }
            }
        }
    }
}
