import SwiftUI

struct WaveformView: View {
    let dataPoints: [Double]
    
    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard dataPoints.count > 1 else { return }
                
                let width = geometry.size.width
                let height = geometry.size.height
                let minVal = 0.1
                let maxVal = 0.5
                let range = maxVal - minVal
                
                let stepX = width / CGFloat(dataPoints.count - 1)
                
                for i in 0..<dataPoints.count {
                    let x = CGFloat(i) * stepX
                    let y = height - CGFloat((dataPoints[i] - minVal) / range) * height
                    
                    if i == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(Color.sdPrimary, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.sdPrimary.opacity(0.3), Color.sdPrimary.opacity(0)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .clipShape(WaveformFillShape(dataPoints: dataPoints))
            )
        }
    }
}

struct WaveformFillShape: Shape {
    let dataPoints: [Double]
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard dataPoints.count > 1 else { return path }
        
        let width = rect.size.width
        let height = rect.size.height
        let minVal = 0.1
        let maxVal = 0.5
        let range = maxVal - minVal
        let stepX = width / CGFloat(dataPoints.count - 1)
        
        path.move(to: CGPoint(x: 0, y: height))
        
        for i in 0..<dataPoints.count {
            let x = CGFloat(i) * stepX
            let y = height - CGFloat((dataPoints[i] - minVal) / range) * height
            path.addLine(to: CGPoint(x: x, y: y))
        }
        
        path.addLine(to: CGPoint(x: width, y: height))
        path.closeSubpath()
        return path
    }
}
