import SwiftUI

struct InputField: View {
    var label: String
    @Binding var text: String
    var placeholder: String = ""
    var isSecure: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.caption)
                .foregroundColor(.sdMuted)
                .textCase(.uppercase)
            
            HStack {
                if isSecure {
                    SecureField(placeholder, text: $text)
                        .foregroundColor(.sdForeground)
                } else {
                    TextField(placeholder, text: $text)
                        .foregroundColor(.sdForeground)
                        .autocapitalization(.none)
                }
            }
            .padding()
            .background(Color.sdCard)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.sdCardBorder, lineWidth: 1)
            )
        }
    }
}


