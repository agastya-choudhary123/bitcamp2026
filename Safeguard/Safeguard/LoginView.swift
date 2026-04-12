import SwiftUI
import Auth0

struct LoginView: View {
    @AppStorage("isLoggedIn") private var isLoggedIn = false
    @AppStorage("activeUsername") private var activeUsername = ""
    @AppStorage("driverName") private var driverName = ""

    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            // Light background
            Color.sdBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Safeguard Rebranded Header
                VStack(spacing: 20) {
                    ZStack {
                        Circle()
                            .fill(Color.sdForeground)
                            .frame(width: 80, height: 80)
                        
                        // New Safeguard Shield (system icon for now, real asset can be swapped)
                        Image(systemName: "shield.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.white)
                    }

                    VStack(spacing: 8) {
                        Text("Welcome")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        
                        Text("Sign in to Safeguard to continue.")
                            .font(.subheadline)
                            .foregroundColor(.sdMuted)
                    }
                }
                .padding(.bottom, 48)

                // Login Card (Matches screenshot card style)
                VStack(spacing: 24) {
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.sdRed)
                            .font(.system(size: 13, weight: .medium))
                            .multilineTextAlignment(.center)
                            .padding(.bottom, 8)
                    }

                    Button(action: { signIn(screenHint: nil) }) {
                        HStack {
                            if isLoading {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Continue")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.sdPrimary)
                        .cornerRadius(10) // Sharper corners like screenshot
                        .shadow(color: Color.sdPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .disabled(isLoading)

                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundColor(.sdMuted)
                        Button(action: { signIn(screenHint: "signup") }) {
                            Text("Sign up")
                                .foregroundColor(.sdPrimary)
                                .fontWeight(.bold)
                        }
                    }
                    .font(.footnote)

                    HStack {
                        Rectangle().fill(Color.sdCardBorder).frame(height: 1)
                        Text("OR").font(.caption2).foregroundColor(.sdSubtle).padding(.horizontal, 8)
                        Rectangle().fill(Color.sdCardBorder).frame(height: 1)
                    }
                    .padding(.vertical, 8)

                    // Google button connected to Auth0
                    Button(action: { signIn(screenHint: nil, connection: "google-oauth2") }) {
                        HStack {
                            Image(systemName: "g.circle.fill")
                                .foregroundColor(.sdMuted)
                            Text("Continue with Google")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.sdForeground)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(RoundedRectangle(cornerRadius: 8).stroke(Color.sdCardBorder, lineWidth: 1))
                    }
                }
                .padding(32)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.1), radius: 30, x: 0, y: 15)
                )
                .padding(.horizontal, 24)

                Spacer()
                
                // Bottom small logo/branding
                Image(systemName: "shield.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.sdForeground.opacity(0.1))
                    .padding(.bottom, 20)
            }
        }
    }

    private func signIn(screenHint: String?, connection: String? = nil) {
        isLoading = true
        errorMessage = ""

        var webAuth = Auth0.webAuth()
        if let hint = screenHint {
            webAuth = webAuth.parameters(["screen_hint": hint])
        }
        if let conn = connection {
            webAuth = webAuth.connection(conn)
        }

        webAuth.start { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let credentials):
                    NetworkManager.shared.accessToken = credentials.accessToken
                    let sub = credentials.idToken
                    let name = extractName(from: credentials.idToken) ?? "Driver"
                    activeUsername = extractSub(from: credentials.idToken) ?? sub
                    driverName = name
                    syncWithBackend(name: name)
                case .failure(let error):
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func syncWithBackend(name: String) {
        let body: [String: Any] = ["name": name]
        NetworkManager.shared.request(endpoint: "/auth/sync", method: "POST", body: body) { (result: Result<NetworkManager.AuthResponse, Error>) in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    if let user = response.user {
                        activeUsername = user.username
                        driverName = user.name
                    }
                case .failure:
                    break 
                }
                isLoggedIn = true
            }
        }
    }

    private func extractName(from idToken: String) -> String? {
        let parts = idToken.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var base64 = String(parts[1])
        let remainder = base64.count % 4
        if remainder != 0 { base64 += String(repeating: "=", count: 4 - remainder) }
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return json["name"] as? String ?? json["nickname"] as? String
    }

    private func extractSub(from idToken: String) -> String? {
        let parts = idToken.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var base64 = String(parts[1])
        let remainder = base64.count % 4
        if remainder != 0 { base64 += String(repeating: "=", count: 4 - remainder) }
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return json["sub"] as? String
    }
}
