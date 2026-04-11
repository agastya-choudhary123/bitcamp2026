import Foundation

class NetworkManager {
    static let shared = NetworkManager()
    
    // Extracted from Macbook Ethernet/Wifi for iOS physical device connection!
    let baseURL = "http://172.23.27.184:3001"
    
    private init() {}
    
    // MARK: - Models
    
    struct User: Codable {
        let name: String
        let username: String
    }
    
    struct AuthResponse: Codable {
        let success: Bool?
        let error: String?
        let user: User?
    }
    
    struct ContactResponse: Codable, Identifiable {
        var id: String { name ?? UUID().uuidString }
        var name: String?
        var phone: String?
        var relationship: String?
    }
    
    struct ReportModel: Codable, Identifiable {
        let _id: String
        let driverName: String
        let timestamp: String?
        let reportText: String?
        
        var id: String { _id }
    }
    
    struct ReplayModel: Codable, Identifiable {
        let _id: String
        let driverName: String
        let sessionStart: String?
        let sessionEnd: String?
        let videoUrl: String?
        
        var id: String { _id }
    }
    
    struct StatusResponse: Codable {
        let driverName: String?
        let ear: Double?
        let perclos: Double?
        let emergencyTriggered: Bool?
        let internalMetrics: InternalMetrics?
        
        enum CodingKeys: String, CodingKey {
            case driverName, ear, perclos, emergencyTriggered
            case internalMetrics = "internal"
        }
        
        struct InternalMetrics: Codable {
            let drowsiness: DrowsinessMetrics?
        }
        struct DrowsinessMetrics: Codable {
            let state: String?
        }
    }
    
    func request<T: Decodable>(endpoint: String, method: String = "GET", body: Any? = nil, completion: @escaping (Result<T, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            completion(.failure(NSError(domain: "NetworkManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("🚨 NETWORK ERROR: \(error.localizedDescription)")
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                print("🌐 SERVER RESPONSE: \(httpResponse.statusCode)")
            }
            
            guard let data = data else {
                print("⚠️ NO DATA RECEIVED FROM SERVER")
                DispatchQueue.main.async { completion(.failure(NSError(domain: "NetworkManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }
            
            do {
                let decodedResponse = try JSONDecoder().decode(T.self, from: data)
                print("✅ DECODE SUCCESS")
                DispatchQueue.main.async { completion(.success(decodedResponse)) }
            } catch let decodeError {
                print("❌ DECODE ERROR: \(decodeError)")
                DispatchQueue.main.async { completion(.failure(decodeError)) }
            }
        }.resume()
    }
}
