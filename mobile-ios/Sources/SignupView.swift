import SwiftUI
import Auth0

struct SignupView: View {
    @Environment(\.presentationMode) var presentationMode
    @AppStorage("isLoggedIn") private var isLoggedIn = false
    @AppStorage("activeUsername") private var activeUsername = ""
    @AppStorage("driverName") private var driverName = ""

    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Back Button
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.sdForeground)
                            .padding(12)
                            .background(Color.white)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.05), radius: 4)
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)

                Spacer()

                // Header
                VStack(spacing: 20) {
                    ZStack {
                        Circle()
                            .fill(Color.sdPrimary.opacity(0.1))
                            .frame(width: 80, height: 80)
                        Image(systemName: "person.badge.plus.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.sdPrimary)
                    }

                    VStack(spacing: 8) {
                        Text("Create Account")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        Text("Join Safeguard for professional driver monitoring.")
                            .font(.subheadline)
                            .foregroundColor(.sdMuted)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.bottom, 40)

                // Card
                VStack(spacing: 24) {
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.sdRed)
                            .font(.system(size: 13, weight: .medium))
                            .padding(.bottom, 8)
                    }

                    Button(action: { signUp() }) {
                        HStack {
                            if isLoading {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Continue with Auth0")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.sdPrimary)
                        .cornerRadius(12)
                        .shadow(color: Color.sdPrimary.opacity(0.3), radius: 8, y: 4)
                    }
                    .disabled(isLoading)

                    VStack(spacing: 16) {
                        HStack {
                            Rectangle().fill(Color.sdCardBorder).frame(height: 1)
                            Text("SECURITY NOTICE").font(.system(size: 10, weight: .black)).foregroundColor(.sdSubtle).padding(.horizontal, 10)
                            Rectangle().fill(Color.sdCardBorder).frame(height: 1)
                        }
                        
                        Text("Safeguard uses bank-grade encryption to secure your biometric telemetry. Your data is yours.")
                            .font(.system(size: 11))
                            .foregroundColor(.sdSubtle)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                    }
                }
                .padding(32)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.1), radius: 30, x: 0, y: 15)
                )
                .padding(.horizontal, 24)

                Spacer()
            }
        }
        .navigationBarHidden(true)
    }

    private func signUp() {
        isLoading = true
        errorMessage = ""

        Auth0
            .webAuth()
            .parameters(["screen_hint": "signup"])
            .start { result in
                DispatchQueue.main.async {
                    isLoading = false
                    switch result {
                    case .success(let credentials):
                        NetworkManager.shared.accessToken = credentials.accessToken
                        let name = extractName(from: credentials.idToken) ?? "Driver"
                        activeUsername = extractSub(from: credentials.idToken) ?? "User"
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
                if case .success(let response) = result, let user = response.user {
                    activeUsername = user.username
                    driverName = user.name
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
