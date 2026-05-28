import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    console.log("Testing gemini-1.5-flash...");
    const res = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Hello"
    });
    console.log("Success:", res.text);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
