import WebKit

/// Serves local files from the staged tmp directory with correct MIME types.
/// WKWebView's file:// protocol doesn't serve correct MIME types for WASM,
/// so we use a custom "safeguard-local://" scheme instead.
class LocalFileSchemeHandler: NSObject, WKURLSchemeHandler {
    let baseDirectory: URL
    
    init(baseDirectory: URL) {
        self.baseDirectory = baseDirectory
        super.init()
    }
    
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(NSError(domain: "LocalFileSchemeHandler", code: -1))
            return
        }
        
        // Convert safeguard-local://host/path to local file path
        let relativePath = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
        let fileURL = baseDirectory.appendingPathComponent(relativePath)
        
        print("🔧 SCHEME: \(relativePath) → \(fileURL.path) [\(Self.mimeType(for: fileURL.pathExtension))]")
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            print("⚠️ SCHEME HANDLER: File not found: \(relativePath)")
            urlSchemeTask.didFailWithError(NSError(domain: "LocalFileSchemeHandler", code: 404,
                userInfo: [NSLocalizedDescriptionKey: "File not found: \(relativePath)"]))
            return
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            let mimeType = Self.mimeType(for: fileURL.pathExtension)
            
            // Must use HTTPURLResponse (not URLResponse) so WebAssembly.instantiateStreaming
            // can read the Content-Type header for WASM validation
            let response = HTTPURLResponse(
                url: url,
                statusCode: 200,
                httpVersion: "HTTP/1.1",
                headerFields: [
                    "Content-Type": mimeType,
                    "Content-Length": "\(data.count)",
                    "Access-Control-Allow-Origin": "*"
                ]
            )!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            print("❌ SCHEME HANDLER: Error reading \(relativePath): \(error)")
            urlSchemeTask.didFailWithError(error)
        }
    }
    
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Nothing to clean up
    }
    
    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html":  return "text/html"
        case "js", "mjs": return "application/javascript"
        case "wasm":  return "application/wasm"
        case "json":  return "application/json"
        case "task":  return "application/octet-stream"
        case "css":   return "text/css"
        case "png":   return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        default:      return "application/octet-stream"
        }
    }
}
