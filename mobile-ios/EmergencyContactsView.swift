import SwiftUI

struct EmergencyContactsView: View {
    @State private var name = ""
    @State private var phone = ""
    @State private var relationship = ""
    @State private var isSaved = false
    @State private var isLoading = false
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            VStack {
                // Header
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .padding(12)
                            .background(Color.sdCard)
                            .clipShape(Circle())
                    }
                    VStack(alignment: .leading) {
                        Text("Emergency Contact").font(.title2).bold()
                        Text("NOTIFY IN CRITICAL DROWSINESS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                    Spacer()
                }
                .padding()
                
                ScrollView {
                    VStack(spacing: 20) {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "bubble.left.and.bubble.right.fill").foregroundColor(.sdPrimary)
                                    Text("How it works").font(.headline)
                                }
                                Text("If critical drowsiness (PERCLOS > 0.12) is detected, an automated SMS will be sent to this contact with your live GPS location.")
                                    .font(.subheadline).foregroundColor(.sdMuted)
                                    .lineSpacing(4)
                            }
                        }
                        
                        GlassCard {
                            VStack(spacing: 20) {
                                InputField(label: "Full Name", text: $name, placeholder: "Jane Doe")
                                InputField(label: "Phone Number", text: $phone, placeholder: "+1 (555) 000-0000")
                                    .keyboardType(.phonePad)
                                InputField(label: "Relationship", text: $relationship, placeholder: "Spouse, Parent...")
                                
                                Button(action: saveContact) {
                                    HStack {
                                        if isLoading {
                                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        } else {
                                            Image(systemName: isSaved ? "checkmark" : "person.badge.shield.fill")
                                            Text(isSaved ? "Saved Successfully" : "Update Contact")
                                        }
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(isSaved ? Color.sdGreen : Color.sdPrimary)
                                    .cornerRadius(16)
                                }
                                .disabled(isLoading)
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear(perform: fetchContact)
    }

    func fetchContact() {
        guard let username = UserDefaults.standard.string(forKey: "username") else { return }
        
        let url = URL(string: "http://localhost:3001/user/\(username)/contact")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                DispatchQueue.main.async {
                    self.name = json["name"] as? String ?? ""
                    self.phone = json["phone"] as? String ?? ""
                    self.relationship = json["relationship"] as? String ?? ""
                }
            }
        }.resume()
    }

    func saveContact() {
        guard let username = UserDefaults.standard.string(forKey: "username") else { return }
        isLoading = true
        
        let url = URL(string: "http://localhost:3001/user/\(username)/contact")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["name": name, "phone": phone, "relationship": relationship]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            DispatchQueue.main.async {
                isLoading = false
                if data != nil {
                    isSaved = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { isSaved = false }
                }
            }
        }.resume()
    }
}
