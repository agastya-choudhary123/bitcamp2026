import SwiftUI
import Auth0

struct EmergencyContactsView: View {
    @AppStorage("activeUsername") private var activeUsername = ""
    @AppStorage("isLoggedIn") private var isLoggedIn = true
    
    @State private var contacts: [NetworkManager.ContactResponse] = []
    
    // Form fields for adding new
    @State private var contactName = ""
    @State private var contactPhone = ""
    @State private var contactRelationship = ""
    
    @State private var isLoading = false
    @State private var showSuccess = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SOS Circle")
                                .font(.largeTitle).bold()
                                .foregroundColor(.white)
                            
                            Text("Your safety broadcast list.")
                                .font(.footnote)
                                .foregroundColor(.sdMuted)
                        }
                        
                        Spacer()
                        
                        Button(action: {
                            Auth0.webAuth().clearSession { _ in
                                NetworkManager.shared.accessToken = nil
                                isLoggedIn = false
                                activeUsername = ""
                            }
                        }) {
                            Text("Logout")
                                .font(.caption).bold()
                                .foregroundColor(.white)
                                .padding(8)
                                .padding(.horizontal, 10)
                                .background(Color.sdRed.opacity(0.3))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.sdRed, lineWidth: 1)
                                )
                        }
                    }
                    .padding(.top, 20)
                    .padding(.horizontal)
                    
                    // Add New Form
                    GlassCard {
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                Text("Add to Circle")
                                    .font(.headline)
                            }
                            .foregroundColor(.sdMuted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            HStack(spacing: 10) {
                                InputField(label: "Name", text: $contactName, placeholder: "Mom")
                                InputField(label: "Phone", text: $contactPhone, placeholder: "555...")
                            }
                            
                            HStack {
                                InputField(label: "Relation", text: $contactRelationship, placeholder: "Family")
                                
                                Button(action: addContactLocal) {
                                    Image(systemName: "plus")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .padding()
                                        .background(Color.sdPrimary)
                                        .cornerRadius(12)
                                }
                                .padding(.top, 22)
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    // Contacts List
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ACTIVE EMERGENCY RECIPIENTS")
                            .font(.caption2).bold().kerning(1)
                            .foregroundColor(.sdMuted)
                            .padding(.horizontal)
                        
                        if contacts.isEmpty {
                            Spacer()
                            Text("No contacts added yet.")
                                .foregroundColor(.sdMuted)
                                .frame(maxWidth: .infinity, alignment: .center)
                            Spacer()
                        } else {
                            ScrollView {
                                VStack(spacing: 12) {
                                    ForEach(contacts) { contact in
                                        GlassCard {
                                            HStack {
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text(contact.name ?? "Unknown").font(.headline)
                                                    Text("\(contact.relationship ?? "") • \(contact.phone ?? "")")
                                                        .font(.caption)
                                                        .foregroundColor(.sdMuted)
                                                }
                                                Spacer()
                                                Button(action: { removeContact(contact.id) }) {
                                                    Image(systemName: "trash")
                                                        .foregroundColor(.sdRed)
                                                }
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Sync Button
                    Button(action: saveContactsToServer) {
                        HStack {
                            if isLoading {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: showSuccess ? "checkmark.circle.fill" : "icloud.and.arrow.up")
                                Text(showSuccess ? "Sync Complete" : "Sync All to Server")
                            }
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(showSuccess ? Color.sdGreen : Color.sdPrimary)
                        .cornerRadius(16)
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                    .disabled(isLoading)
                }
            }
            .navigationBarHidden(true)
            .onAppear(perform: loadContacts)
        }
    }
    
    func addContactLocal() {
        guard !contactName.isEmpty && !contactPhone.isEmpty else { return }
        let newContact = NetworkManager.ContactResponse(name: contactName, phone: contactPhone, relationship: contactRelationship)
        contacts.append(newContact)
        
        // Reset fields
        contactName = ""
        contactPhone = ""
        contactRelationship = ""
    }
    
    func removeContact(_ id: String) {
        contacts.removeAll { $0.id == id }
    }
    
    func loadContacts() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        NetworkManager.shared.request(endpoint: "/user/\(activeUsername)/contact") { (result: Result<[NetworkManager.ContactResponse], Error>) in
            isLoading = false
            switch result {
            case .success(let res):
                contacts = res
            case .failure(let err):
                print("Failed to load contacts: \(err)")
            }
        }
    }
    
    func saveContactsToServer() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        showSuccess = false
        
        // Convert array of structs to array of Dictionaries for JSONSerialization
        let payload = contacts.map { [
            "name": $0.name ?? "",
            "phone": $0.phone ?? "",
            "relationship": $0.relationship ?? ""
        ]}
        
        print("Syncing \(contacts.count) contacts...")
        
        NetworkManager.shared.request(endpoint: "/user/\(activeUsername)/contact", method: "POST", body: payload) { (result: Result<[NetworkManager.ContactResponse], Error>) in
            isLoading = false
            switch result {
            case .success(let updated):
                contacts = updated
                showSuccess = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { showSuccess = false }
            case .failure(let err):
                print("Failed to save contacts: \(err)")
            }
        }
    }
}
