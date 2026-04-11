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
            Color.sdBackground.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

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

                GlassCard {
                    VStack(spacing: 16) {
                        if !errorMessage.isEmpty {
                            Text(errorMessage)
                                .foregroundColor(.sdRed)
                                .font(.caption)
                                .multilineTextAlignment(.center)
                        }

                        Button(action: { signIn(screenHint: nil) }) {
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

                        Button(action: { signIn(screenHint: "signup") }) {
                            HStack(spacing: 4) {
                                Text("New to SafeDrive? ")
                                    .foregroundColor(.sdMuted)
                                Text("Create an account")
                                    .foregroundColor(.sdPrimary).bold()
                            }
                            .font(.footnote)
                        }
                        .disabled(isLoading)
                    }
                }

                Spacer()
            }
            .padding(24)
        }
    }

    private func signIn(screenHint: String?) {
        isLoading = true
        errorMessage = ""

        var webAuth = Auth0.webAuth()
        if let hint = screenHint {
            webAuth = webAuth.parameters(["screen_hint": hint])
        }

        webAuth.start { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let credentials):
                    NetworkManager.shared.accessToken = credentials.accessToken
                    let sub = credentials.idToken // use sub from token or fallback
                    // Sync user with backend
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
            switch result {
            case .success(let response):
                if let user = response.user {
                    activeUsername = user.username
                    driverName = user.name
                }
            case .failure:
                break // token is valid; proceed anyway
            }
            isLoggedIn = true
        }
    }

    /// Decode the `name` claim from the JWT id_token (no external lib needed).
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

    /// Decode the `sub` claim from the JWT id_token.
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
