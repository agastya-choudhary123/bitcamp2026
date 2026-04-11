import SwiftUI

struct Contact: Identifiable {
    let id = UUID()
    let name: String
    let phone: String
}

struct EmergencyContactsView: View {
    @State private var contacts = [
        Contact(name: "Dad", phone: "+1 (555) 123-4567"),
        Contact(name: "Mom", phone: "+1 (555) 987-6543")
    ]
    
    // State for Add Contact Alert
    @State private var showingAddContact = false
    @State private var newName = ""
    @State private var newPhone = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Emergency Setup")
                            .font(.largeTitle).bold()
                            .foregroundColor(.white)
                        
                        Text("Manage your personal emergency phone numbers.")
                            .font(.footnote)
                            .foregroundColor(.sdMuted)
                    }
                    .padding(.top, 20)
                    .padding(.horizontal)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    // List of Contacts
                    List {
                        ForEach(contacts) { contact in
                            HStack {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.system(size: 30))
                                    .foregroundColor(.sdPrimary)
                                
                                VStack(alignment: .leading) {
                                    Text(contact.name)
                                        .font(.headline)
                                        .foregroundColor(.white)
                                    Text(contact.phone)
                                        .font(.subheadline)
                                        .foregroundColor(.sdMuted)
                                }
                            }
                            .listRowBackground(Color.sdCard)
                        }
                        .onDelete(perform: deleteContact)
                    }
                    .scrollContentBackground(.hidden) // Removes default iOS List background
                    
                    // Add Contact Button
                    Button(action: {
                        showingAddContact = true
                    }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add Emergency Contact")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.sdPrimary)
                        .cornerRadius(16)
                    }
                    .padding()
                }
            }
            .navigationBarHidden(true)
            .alert("Add Contact", isPresented: $showingAddContact) {
                TextField("Name", text: $newName)
                TextField("Phone Number", text: $newPhone)
                    .keyboardType(.phonePad)
                
                Button("Add", action: addContact)
                Button("Cancel", role: .cancel) {
                    newName = ""
                    newPhone = ""
                }
            }
        }
    }
    
    func deleteContact(at offsets: IndexSet) {
        contacts.remove(atOffsets: offsets)
    }
    
    func addContact() {
        guard !newName.isEmpty && !newPhone.isEmpty else { return }
        contacts.append(Contact(name: newName, phone: newPhone))
        newName = ""
        newPhone = ""
    }
}
