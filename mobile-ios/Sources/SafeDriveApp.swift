import SwiftUI

@main
struct SafeDriveApp: App {
    // AppStorage binds directly to UserDefaults, persisting the login state across app launches.
    @AppStorage("isLoggedIn") private var isLoggedIn: Bool = false
    
    var body: some Scene {
        WindowGroup {
            if isLoggedIn {
                MainTabView()
                    .preferredColorScheme(.dark)
            } else {
                LoginView()
                    .preferredColorScheme(.dark)
            }
        }
    }
}
