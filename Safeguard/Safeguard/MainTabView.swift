import SwiftUI

struct MainTabView: View {
    @AppStorage("activeUsername") private var activeUsername: String = ""
    @AppStorage("driverName") private var driverNameKey: String = ""

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "shield.fill")
                }

            ReportsView()
                .tabItem {
                    Label("Analysis", systemImage: "chart.pie.fill")
                }

            EmergencyContactsView()
                .tabItem {
                    Label("Circle", systemImage: "person.3.fill")
                }
            
            GuideView()
                .tabItem {
                    Label("Help", systemImage: "questionmark.circle.fill")
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
