import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var isLoggedIn = false
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
                                    .font(.caption)
                                    .foregroundColor(.sdRed)
                            }
                            
                            NavigationLink(destination: DashboardView(), isActive: $isLoggedIn) {
                                Button(action: performLogin) {
                                    HStack {
                                        if isLoading {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
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

    func performLogin() {
        guard !username.isEmpty && !password.isEmpty else { return }
        isLoading = true
        errorMessage = ""
        
        // Match the backend URL - replace with your computer's IP for local network testing
        let url = URL(string: "http://localhost:3001/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["username": username, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                isLoading = false
                if let data = data {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let success = json["success"] as? Bool, success,
                       let user = json["user"] as? [String: Any] {
                        
                        UserDefaults.standard.set(user["name"], forKey: "driverName")
                        UserDefaults.standard.set(user["username"], forKey: "username")
                        isLoggedIn = true
                    } else {
                        errorMessage = "Invalid credentials"
                    }
                } else {
                    errorMessage = "Server connection failed"
                }
            }
        }.resume()
    }
}
