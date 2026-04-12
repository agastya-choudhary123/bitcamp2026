import SwiftUI
import Auth0

struct EmergencyContactsView: View {
    @AppStorage("activeUsername") private var activeUsername = ""
    @AppStorage("isLoggedIn") private var isLoggedIn = true
    
    @State private var contacts: [NetworkManager.ContactResponse] = []
    
    // Form fields
    @State private var contactName = ""
    @State private var contactPhone = ""
    @State private var contactRelationship = ""
    
    @State private var isLoading = false
    @State private var isSaving = false
    @State private var showSuccess = false
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header Area
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Emergency Contacts")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        
                        Text("Your Safeguard broadcast list.")
                            .font(.system(size: 13))
                            .foregroundColor(.sdMuted)
                        
                        if isSaving {
                            HStack(spacing: 6) {
                                ProgressView()
                                    .scaleEffect(0.6)
                                Text("Saving Changes...")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.sdPrimary)
                            }
                            .padding(.top, 4)
                        } else if showSuccess {
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 10))
                                Text("Saved to Profile")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundColor(.sdGreen)
                            .padding(.top, 4)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 24)
                .background(Color.sdBackground)

                // Scrollable Content
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Add New Form
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                Text("Add New Contact")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            .foregroundColor(.sdPrimary)
                            
                            VStack(spacing: 12) {
                                InputField(label: "Name", text: $contactName, placeholder: "e.g. Mom")
                                InputField(label: "Phone", text: $contactPhone, placeholder: "+1...")
                                InputField(label: "Relationship", text: $contactRelationship, placeholder: "Family")
                            }
                            
                            Button(action: addContactLocal) {
                                Text("Add to List")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.sdPrimary.opacity(isSaving ? 0.6 : 1.0))
                                    .cornerRadius(10)
                            }
                            .disabled(isSaving || contactName.isEmpty || contactPhone.isEmpty)
                            .padding(.top, 4)
                        }
                        .padding(20)
                        .background(Color.white)
                        .cornerRadius(18)
                        .shadow(color: .black.opacity(0.04), radius: 10, y: 5)
                        
                        // Contacts List
                        VStack(alignment: .leading, spacing: 12) {
                            Text("ACTIVE RECIPIENTS")
                                .font(.system(size: 10, weight: .bold))
                                .kerning(1)
                                .foregroundColor(.sdMuted)
                                .padding(.horizontal, 4)
                            
                            if contacts.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "person.2.slash")
                                        .font(.system(size: 32))
                                        .foregroundColor(.sdSubtle)
                                    Text("No contacts added yet.")
                                        .font(.system(size: 13))
                                        .foregroundColor(.sdMuted)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 40)
                            } else {
                                ForEach(contacts) { contact in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(contact.name ?? "Unknown")
                                                .font(.system(size: 15, weight: .bold))
                                                .foregroundColor(.sdForeground)
                                            Text("\(contact.relationship ?? "") • \(contact.phone ?? "")")
                                                .font(.system(size: 12))
                                                .foregroundColor(.sdMuted)
                                        }
                                        Spacer()
                                        Button(action: { removeContact(contact.id) }) {
                                            Image(systemName: "trash")
                                                .font(.system(size: 14))
                                                .foregroundColor(.sdRed.opacity(0.6))
                                                .padding(8)
                                                .background(Color.sdRed.opacity(0.05))
                                                .clipShape(Circle())
                                        }
                                        .disabled(isSaving)
                                    }
                                    .padding(16)
                                    .background(Color.white)
                                    .cornerRadius(14)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.sdCardBorder, lineWidth: 1))
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)
                }

                // PINNED SAVE BUTTON (Always Visible Footer)
                VStack(spacing: 0) {
                    Divider()
                        .background(Color.sdCardBorder)
                    
                    Button(action: {
                        print("🚀 SAVE BUTTON CLICKED - Starting Sync...")
                        saveContactsToServer()
                    }) {
                        HStack {
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "cloud.fill")
                                Text("Save Changes")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.sdPrimary)
                        .cornerRadius(12)
                        .shadow(color: Color.sdPrimary.opacity(0.3), radius: 10, y: 5)
                        .contentShape(Rectangle())
                    }
                    .disabled(isSaving)
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    .padding(.bottom, 34) // Safe area padding
                    .background(Color.white)
                }
            }
        }
        .onAppear(perform: loadContacts)
    }
    
    func addContactLocal() {
        guard !contactName.isEmpty && !contactPhone.isEmpty else { return }
        let newContact = NetworkManager.ContactResponse(_id: nil, name: contactName, phone: contactPhone, relationship: contactRelationship)
        contacts.append(newContact)
        contactName = ""; contactPhone = ""; contactRelationship = ""
    }
    
    func removeContact(_ id: String) {
        contacts.removeAll { $0.id == id }
    }
    
    func loadContacts() {
        guard !activeUsername.isEmpty else { return }
        let encodedUsername = activeUsername.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? activeUsername
        isLoading = true
        NetworkManager.shared.request(endpoint: "/user/\(encodedUsername)/contact") { (result: Result<[NetworkManager.ContactResponse], Error>) in
            DispatchQueue.main.async {
                isLoading = false
                if case .success(let res) = result { 
                    self.contacts = res 
                    print("✅ Contacts Loaded: \(res.count)")
                }
            }
        }
    }
    
    func saveContactsToServer() {
        guard !activeUsername.isEmpty else { return }
        let encodedUsername = activeUsername.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? activeUsername
        isSaving = true; showSuccess = false
        // Map to plain dictionary for server, excluding nil _id to avoid JSON serialization issues
        let payload = ["emergencyContacts": contacts.map { contact -> [String: Any] in
            var dict: [String: Any] = [
                "name": contact.name ?? "",
                "phone": contact.phone ?? "",
                "relationship": contact.relationship ?? ""
            ]
            if let existingId = contact._id {
                dict["_id"] = existingId
            }
            return dict
        }]
        
        NetworkManager.shared.request(endpoint: "/user/\(encodedUsername)/contact", method: "POST", body: payload) { (result: Result<[NetworkManager.ContactResponse], Error>) in
            DispatchQueue.main.async {
                isSaving = false
                switch result {
                case .success(let updated):
                    self.contacts = updated
                    self.showSuccess = true
                    print("✅ Server Sync Successful (Count: \(updated.count))")
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.showSuccess = false }
                case .failure(let err):
                    print("❌ Server Sync Failed: \(err.localizedDescription)")
                    self.loadContacts() // Rollback to server state
                }
            }
        }
    }
}
