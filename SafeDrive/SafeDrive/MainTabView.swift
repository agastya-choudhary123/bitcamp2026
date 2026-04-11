import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            // Tab 1: Live Drive (CV Web wrapper)
            DashboardView()
                .tabItem {
                    Image(systemName: "steeringwheel")
                    Text("Drive Mode")
                }
            
            // Tab 2: Post-Drive Reports Analytics
            ReportsView()
                .tabItem {
                    Image(systemName: "doc.text.magnifyingglass")
                    Text("Reports")
                }
            
            // Tab 3: Replays & Reports
            ReplaysView()
                .tabItem {
                    Image(systemName: "play.rectangle.fill")
                    Text("Replays")
                }
            
            // Tab 4: SOS Emergency Pipeline
            EmergencyContactsView()
                .tabItem {
                    Image(systemName: "sos.circle.fill")
                    Text("Emergency")
                }
        }
        .accentColor(.sdPrimary) // Use our custom purple theme
    }
}
