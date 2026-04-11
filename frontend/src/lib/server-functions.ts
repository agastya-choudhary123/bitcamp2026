import { createServerFn } from '@tanstack/react-start';
import { MongoClient, GridFSBucket } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Normally these would be in environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const client = new MongoClient(MONGODB_URI);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const logMetrics = createServerFn()
  .validator((data: any) => data)
  .handler(async (data) => {
    try {
      await client.connect();
      const db = client.db('safedrive');
      const logs = db.collection('driving_logs');
      
      const logEntry = {
        ...data,
        timestamp: new Date(),
      };
      
      const result = await logs.insertOne(logEntry);
      
      // If there's an anomaly and a video clip (as base64 or buffer)
      if (data.is_anomaly && data.clip) {
        const bucket = new GridFSBucket(db, { bucketName: 'anomaly_clips' });
        const buffer = Buffer.from(data.clip, 'base64');
        const uploadStream = bucket.openUploadStream(`anomaly_${result.insertedId}.webm`);
        uploadStream.end(buffer);
      }
      
      return { success: true, id: result.insertedId };
    } catch (error) {
      console.error('Logging error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

export const getSafetyReport = createServerFn()
  .validator((sessionId: string) => sessionId)
  .handler(async (sessionId) => {
    try {
      await client.connect();
      const db = client.db('safedrive');
      const logs = await db.collection('driving_logs')
        .find({ session_id: sessionId })
        .sort({ timestamp: 1 })
        .toArray();
      
      if (logs.length === 0) return { report: "No data available for this session." };

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const logSummary = logs.map(l => ({
        time: l.timestamp,
        ear: l.internal?.drowsiness?.avgEAR,
        state: l.internal?.drowsiness?.state,
        hazard: l.external?.forwardHazard?.state
      }));

      const prompt = `
        Analyze these driving logs from an AI drowsiness detection system:
        ${JSON.stringify(logSummary)}
        
        Provide a concise, professional safety report for the driver.
        Highlight any periods of danger, fatigue trends, or close calls.
        Suggest improvements for their next trip.
        Keep it supportive but firm about safety.
      `;

      const result = await model.generateContent(prompt);
      return { report: result.response.text() };
    } catch (error) {
      console.error('Gemini report error:', error);
      return { error: 'Failed to generate report' };
    }
  });
