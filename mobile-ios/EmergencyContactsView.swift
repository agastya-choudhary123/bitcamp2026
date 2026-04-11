import SwiftUI

struct EmergencyContactsView: View {
    @State private var name = ""
    @State private var phone = ""
    @State private var relationship = ""
    @State private var isSaved = false
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
                                
                                Button(action: { 
                                    isSaved = true
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { isSaved = false }
                                }) {
                                    HStack {
                                        Image(systemName: isSaved ? "checkmark" : "person.badge.shield.fill")
                                        Text(isSaved ? "Saved Successfully" : "Update Contact")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(isSaved ? Color.sdGreen : Color.sdPrimary)
                                    .cornerRadius(16)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationBarHidden(true)
    }
}
