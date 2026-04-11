import SwiftUI

@main
struct SafeDriveApp: App {
    var body: some Scene {
        WindowGroup {
            LoginView()
                .preferredColorScheme(.dark)
        }
    }
}
