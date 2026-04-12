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
    @State private var showSuccess = false
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("SOS Circle")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        
                        Text("Your Safeguard broadcast list.")
                            .font(.system(size: 13))
                            .foregroundColor(.sdMuted)
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 24)

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
                                    .background(Color.sdPrimary)
                                    .cornerRadius(10)
                            }
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
                }

                // Sync/Footer Section
                VStack(spacing: 12) {
                    Button(action: saveContactsToServer) {
                        HStack {
                            if isLoading {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: showSuccess ? "checkmark.circle.fill" : "icloud.and.arrow.up.fill")
                                Text(showSuccess ? "Changes Saved" : "Sync All Contacts")
                            }
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(showSuccess ? Color.sdGreen : Color.sdPrimary)
                        .cornerRadius(14)
                        .shadow(color: (showSuccess ? Color.sdGreen : Color.sdPrimary).opacity(0.3), radius: 10, y: 5)
                    }
                    .disabled(isLoading)
                }
                .padding(24)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 10, y: -5)
            }
        }
        .onAppear(perform: loadContacts)
    }
    
    func addContactLocal() {
        guard !contactName.isEmpty && !contactPhone.isEmpty else { return }
        let newContact = NetworkManager.ContactResponse(name: contactName, phone: contactPhone, relationship: contactRelationship)
        contacts.append(newContact)
        contactName = ""; contactPhone = ""; contactRelationship = ""
    }
    
    func removeContact(_ id: String) {
        contacts.removeAll { $0.id == id }
    }
    
    func loadContacts() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        NetworkManager.shared.request(endpoint: "/user/\(activeUsername)/contact") { (result: Result<[NetworkManager.ContactResponse], Error>) in
            DispatchQueue.main.async {
                isLoading = false
                if case .success(let res) = result { contacts = res }
            }
        }
    }
    
    func saveContactsToServer() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true; showSuccess = false
        let payload = contacts.map { ["name": $0.name ?? "", "phone": $0.phone ?? "", "relationship": $0.relationship ?? ""] }
        NetworkManager.shared.request(endpoint: "/user/\(activeUsername)/contact", method: "POST", body: payload) { (result: Result<[NetworkManager.ContactResponse], Error>) in
            DispatchQueue.main.async {
                isLoading = false
                if case .success(let updated) = result { 
                    contacts = updated
                    showSuccess = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { showSuccess = false }
                }
            }
        }
    }
}
