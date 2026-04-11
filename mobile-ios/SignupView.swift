import SwiftUI

struct SignupView: View {
    @State private var fullName = ""
    @State private var username = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @State private var isSignedUp = false
    @Environment(\.presentationMode) var presentationMode
    
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
                        
                        Text("Join SafeDrive for a safer journey.")
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
                                    .font(.caption)
                                    .foregroundColor(.sdRed)
                            }
                            
                            NavigationLink(destination: DashboardView(), isActive: $isSignedUp) {
                                Button(action: performSignup) {
                                    HStack {
                                        if isLoading {
                                            ProgressView()
                                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
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
                            }
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

    func performSignup() {
        guard !fullName.isEmpty && !username.isEmpty && !password.isEmpty else { return }
        if password != confirmPassword {
            errorMessage = "Passwords do not match"
            return
        }
        
        isLoading = true
        errorMessage = ""
        
        let url = URL(string: "http://localhost:3001/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["name": fullName, "username": username, "password": password]
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
                        isSignedUp = true
                    } else {
                        errorMessage = "Registration failed"
                    }
                } else {
                    errorMessage = "Server connection failed"
                }
            }
        }.resume()
    }
}
