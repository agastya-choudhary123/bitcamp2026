import SwiftUI

struct DriveReport: Identifiable {
    let id = UUID()
    let title: String
    let date: Date
    let score: Int
    let timeLogged: String
}

struct ReportsView: View {
    @State private var selectedDate = Date()
    @State private var filterByDate = false
    
    // Mock Data sorted reverse-chronologically by default
    let allReports = [
        DriveReport(title: "Night Drive to Baltimore", date: Date(), score: 82, timeLogged: "11:45 PM"),
        DriveReport(title: "Morning Commute", date: Calendar.current.date(byAdding: .day, value: -1, to: Date())!, score: 98, timeLogged: "8:05 AM"),
        DriveReport(title: "Long Haul", date: Calendar.current.date(byAdding: .day, value: -2, to: Date())!, score: 75, timeLogged: "1:30 PM")
    ]
    
    var filteredReports: [DriveReport] {
        let sorted = allReports.sorted { $0.date > $1.date } // Force reverse chronological
        
        if filterByDate {
            return sorted.filter { Calendar.current.isDate($0.date, inSameDayAs: selectedDate) }
        }
        return sorted
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(alignment: .leading, spacing: 16) {
                    
                    VStack(alignment: .leading) {
                        Text("Post-Drive Reports").font(.largeTitle).bold().foregroundColor(.white)
                        Text("ANALYTICS GENERATED AFTER A COMPLETED DRIVE")
                            .font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                    .padding(.top)
                    
                    // Date Filter
                    HStack {
                        Toggle(isOn: $filterByDate) {
                            Text("Filter by specific date")
                                .font(.subheadline)
                                .foregroundColor(.white)
                        }
                        .tint(.sdPrimary)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                    
                    if filterByDate {
                        DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .colorScheme(.dark)
                            .padding(.horizontal)
                    }
                    
                    ScrollView {
                        VStack(spacing: 16) {
                            if filteredReports.isEmpty {
                                Text("No reports generated for this day.")
                                    .foregroundColor(.sdMuted)
                                    .padding(.top, 40)
                            } else {
                                ForEach(filteredReports) { report in
                                    GlassCard {
                                        HStack {
                                            VStack(alignment: .leading, spacing: 6) {
                                                Text(report.title).font(.headline).foregroundColor(.white)
                                                Text(report.timeLogged).font(.caption).foregroundColor(.sdMuted)
                                            }
                                            
                                            Spacer()
                                            
                                            VStack(alignment: .trailing) {
                                                Text("Safety Score")
                                                    .font(.caption2)
                                                    .foregroundColor(.sdMuted)
                                                Text("\(report.score)")
                                                    .font(.title2).bold()
                                                    .foregroundColor(report.score > 90 ? .sdGreen : .sdYellow)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationBarHidden(true)
        }
    }
}
