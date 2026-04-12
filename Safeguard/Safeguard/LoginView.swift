import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    
    // Globally attached to UserDefaults
    @AppStorage("isLoggedIn") private var isLoggedIn = false
    @AppStorage("activeUsername") private var activeUsername = ""
    
    @State private var errorMessage = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Logo
                    VStack(spacing: 16) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 60))
                            .foregroundColor(.sdPrimary)
                            .padding(20)
                            .background(Color.sdPrimary.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 24))
                        
                        Text("SafeDrive AI")
                            .font(.system(size: 32, weight: .black))
                            .foregroundColor(.sdForeground)
                        
                        Text("Your companion for safe driving.")
                            .font(.subheadline)
                            .foregroundColor(.sdMuted)
                    }
                    .padding(.top, 40)
                    
                    // Form
                    GlassCard {
                        VStack(spacing: 20) {
                            InputField(label: "Username", text: $username, placeholder: "johndoe123")
                            InputField(label: "Password", text: $password, placeholder: "••••••••", isSecure: true)
                            if !errorMessage.isEmpty {
                                Text(errorMessage)
                                    .foregroundColor(.sdRed)
                                    .font(.caption)
                            }
                            
                            Button(action: { 
                                login()
                            }) {
                                HStack {
                                    if isLoading {
                                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Image(systemName: "arrow.right.circle.fill")
                                        Text("Sign In")
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
                        }
                    }
                    
                    NavigationLink(destination: SignupView()) {
                        HStack(spacing: 4) {
                            Text("New to SafeDrive? ")
                                .foregroundColor(.sdMuted)
                            Text("Create an account")
                                .foregroundColor(.sdPrimary).bold()
                        }
                    }
                    .font(.footnote)
                    
                    Spacer()
                }
                .padding(24)
            }
            .navigationBarHidden(true)
        }
    }
    
    func login() {
        isLoading = true
        errorMessage = ""
        let payload = ["username": username, "password": password]
        
        NetworkManager.shared.request(endpoint: "/login", method: "POST", body: payload) { (result: Result<NetworkManager.AuthResponse, Error>) in
            isLoading = false
            switch result {
            case .success(let response):
                if response.success == true, let user = response.user {
                    activeUsername = user.username
                    isLoggedIn = true 
                } else {
                    errorMessage = response.error ?? "Login failed."
                }
            case .failure(let err):
                errorMessage = err.localizedDescription
            }
        }
    }
}
