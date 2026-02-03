const  { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AIzaSyBePXIbPqdsZ7ohFTC_4OW_V-4jk03fWs4" });   

async function run() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Explain quantum computing simply.",
    systemInstruction: "You are a science educator. Use simple analogies and avoid jargon. Keep explanations under 100 words.",
  });

  console.log(response.text);
}

run();   