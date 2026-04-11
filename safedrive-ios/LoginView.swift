import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var isLoggedIn = false
    
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
                            
                            NavigationLink(destination: DashboardView(), isActive: $isLoggedIn) {
                                Button(action: { isLoggedIn = true }) {
                                    HStack {
                                        Image(systemName: "arrow.right.circle.fill")
                                        Text("Sign In")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.sdPrimary)
                                    .cornerRadius(16)
                                }
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
}
