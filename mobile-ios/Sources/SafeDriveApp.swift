import SwiftUI
import Auth0

@main
struct SafeDriveApp: App {
    @AppStorage("isLoggedIn") private var isLoggedIn: Bool = false

    var body: some Scene {
        WindowGroup {
            if isLoggedIn {
                MainTabView()
                    .preferredColorScheme(.dark)
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
