import SwiftUI

struct SignupView: View {
    @State private var fullName = ""
    @State private var username = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @Environment(\.presentationMode) var presentationMode
    
    @AppStorage("isLoggedIn") private var isLoggedIn = false
    @AppStorage("activeUsername") private var activeUsername = ""
    
    @State private var errorMessage = ""
    @State private var isLoading = false
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 50))
                            .foregroundColor(.sdPrimary)
                            .padding(20)
                            .background(Color.sdPrimary.opacity(0.1))
                            .clipShape(Circle())
                        
                        Text("Create Account")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.sdForeground)
                        
                        Text("Join Safeguard for a safer journey.")
                            .font(.subheadline)
                            .foregroundColor(.sdMuted)
                    }
                    .padding(.top, 20)
                    
                    GlassCard {
                        VStack(spacing: 18) {
                            InputField(label: "Full Name", text: $fullName, placeholder: "John Doe")
                            InputField(label: "Username", text: $username, placeholder: "johndoe_safe")
                            InputField(label: "Password", text: $password, placeholder: "••••••••", isSecure: true)
                            InputField(label: "Confirm Password", text: $confirmPassword, placeholder: "••••••••", isSecure: true)
                            
                            if !errorMessage.isEmpty {
                                Text(errorMessage)
                                    .foregroundColor(.sdRed)
                                    .font(.caption)
                            }
                            
                            Button(action: { register() }) {
                                HStack {
                                    if isLoading {
                                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Create Account")
                                    }
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.sdPrimary)
                                .cornerRadius(16)
                            }
                            .disabled(isLoading)
                            .padding(.top, 10)
                        }
                    }
                    
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Text("Already have an account? ")
                            .foregroundColor(.sdMuted) +
                        Text("Sign In")
                            .foregroundColor(.sdPrimary).bold()
                    }
                    .font(.footnote)
                }
                .padding(24)
            }
        }
        .navigationBarHidden(true)
    }
    
    func register() {
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match."
            return
        }
        
        isLoading = true
        errorMessage = ""
        let payload = ["name": fullName, "username": username, "password": password]
        
        NetworkManager.shared.request(endpoint: "/signup", method: "POST", body: payload) { (result: Result<NetworkManager.AuthResponse, Error>) in
            isLoading = false
            switch result {
            case .success(let response):
                if response.success == true, let user = response.user {
                    activeUsername = user.username
                    isLoggedIn = true 
                } else {
                    errorMessage = response.error ?? "Signup failed."
                }
            case .failure(let err):
                errorMessage = err.localizedDescription
            }
        }
    }
}
