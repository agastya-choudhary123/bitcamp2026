import SwiftUI

struct MainTabView: View {
    @AppStorage("activeUsername") private var activeUsername: String = ""
    @AppStorage("driverName") private var driverNameKey: String = ""
    @StateObject private var backgroundProcessor = BackgroundCVProcessor()
    @AppStorage("debugModeEnabled") private var debugModeEnabled: Bool = false

    var body: some View {
        TabView {
            DashboardView(backgroundProcessor: backgroundProcessor)
                .tabItem { Label("Dashboard", systemImage: "shield.fill") }

            EmergencyContactsView()
                .tabItem { Label("Contacts", systemImage: "person.2.fill") }

            ReplaysView()
                .tabItem { Label("Replays", systemImage: "film.fill") }

            if debugModeEnabled {
                DebugView(processor: backgroundProcessor)
                    .tabItem { Label("Debug", systemImage: "terminal.fill") }
            }
        }
        .accentColor(.sdPrimary) // Use Safeguard Blue for active tab
        // Use standard light tab appearance
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()
            appearance.backgroundColor = .white
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}
