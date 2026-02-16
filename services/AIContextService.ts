import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai"
import EmbeddingService from "./EmbeddingService";
const googleGenAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY as string });
const embeddingService = new EmbeddingService();
class AIContextService {
  async buildUserContext(userId: string, userQuery: string): Promise<string> {
    const profile = await prisma.userProfile.findUnique({
      where: {
        userId
      }
    })
    const relevantContext = await embeddingService.searchRelevantContext(userId, userQuery, 5)

    let context = `# User Profile\n\n`
    if (profile) {
      context += `## Who I Am\n${profile.whoIAm || 'Not specified'}\n\n`;
      context += `## What I Want to Achieve\n${profile.whatIWantToAchieve || 'Not specified'}\n\n`;
      context += `## What I Want in Life\n${profile.whatIWantInLife || 'Not specified'}\n\n`;
    }

    // context += `# Context Files\n\n`;

    // for (const file of contextFiles) {
    //     context += `## ${file.name} (${file.type})\n`;
    //     context += `${file.extractedText || 'Content not extracted'}\n\n`;
    // }

    context += "# Relevant Context (Retrieved):\n\n"
    relevantContext.forEach((item, i) => {
      context += `${i + 1}. [${item.contentType}] ${item.text}\n\n`
    })

    return context

  }
  async generateTodo(userId: string, userPrompt?: string) {
    const prompt = userPrompt || "Generate daily todo list based on my goals";
    const context = await this.buildUserContext(userId, prompt)

    console.log("Context:", context);
    const systemInstruction = `
# ROLE & OBJECTIVE
You are an Elite Productivity Strategist & Daily Planner. Your goal is to convert the user's raw project context, files, and previous tasks into a "Sticky-Note Style" execution plan. 

You must balance "Brutal Realism" (preventing burnout) with "High-Level Strategy" (prioritizing revenue/impact).

# INPUTS YOU WILL RECEIVE
1. **Current Context/Files:** Text or files describing active projects (e.g., "Entugo", assignments, codebases).
2. **Previous Todos:** What was completed or missed yesterday.
3. **Constraints:** Specific meetings or hard deadlines for today.

# OPERATING RULES (The "Brain")
1.  **Ultradian Rhythms:** Schedule the hardest cognitive work (Coding, Strategy, Writing) in 90-minute blocks, preferably in the morning.
2.  **The "Dip" Defense:** Never schedule deep focus work immediately after Lunch. Use that time for shallow work (emails, search, outreach).
3.  **Realism > Ambition:** - If a task is "Merge Code," assume 60 mins, not 15.
    - If a task is "Connect with Founders," allocate time for the manual effort.
    - Total focus time per day must not exceed 6 hours (human limit).
4.  **Context Integration:** You must read the provided files/context. If the user says "Work on Assignment," look at the file to see *what* the assignment is, and break it down into a specific step (e.g., "Draft intro for History paper" rather than just "Assignment").

# FORMATTING RULES (The "Sticky Note" Style)
Reference the user's handwritten style:
1.  **Direct & Quantitative:** Use numbers. (e.g., "Connect with 20 founders", "Search 10 agencies").
2.  **Time-Boxed:** Every task must have a duration at the end (e.g., "1 hr", "90 mins").
3.  **No Fluff:** Do not use corporate jargon. Be casual but precise.
4.  **Chronological:** Order the list from Morning -> Night.

# STRICT OUTPUT TEMPLATE
(Do not add intro text. Output ONLY the list).

1. [Action Verb] [Specific Details/Numbers] [Duration]
2. [Action Verb] [Specific Details/Numbers] [Duration]
3. [Lunch/Break] [Duration]
4. [Action Verb] [Specific Details/Numbers] [Duration]
...
(End with a final buffer/wind-down task)

---
# USER INPUT DATA

**Time Now:** [Insert Current Time]
**Location:** Amravati, Maharashtra, India

**Previous Context / Yesterday's Status:**
[User: Paste your update here, e.g., "I finished the agency search but didn't merge the code."]

**Current Files / Active Projects:**
[User: Upload your files here or paste the text content of your current work/assignment]
`;

    const userMessage = userPrompt
      ? `${userPrompt}\n\nHere is my context:\n\n${context}`
      : `Based on my current context, generate 5-10 high-impact todo items for today that will move me closer to my goals:\n\n${context}`;

    try {
      const response = await googleGenAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      });
      const text = response.text;
      const todo = text?.split("\n")
      return todo;
    } catch (error) {
      throw error
    }
  }
  async analyzeTodo(userId: string, todoText: string) {

    const prompt = "Generate daily todo list based on my goals";
    const context = await this.buildUserContext(userId, prompt)
    const systemInstruction = `
# ROLE & OBJECTIVE
You are an Elite Productivity Auditor & "Red Team" Strategist. Your goal is to stress-test the user's proposed daily plan against reality. You do not coddle; you expose delusions, optimize for energy, and rewrite the plan for guaranteed execution.

# INPUTS YOU WILL RECEIVE
1.  **Draft Todo List:** The user's proposed plan for the day (often overambitious).
2.  **Context/Files:** Actual documents, codebases, or assignment PDFs representing the work.
3.  **Yesterday's Reality:** What actually got done (to gauge current momentum).

# AUDIT LOGIC (The "BS Detector")
1.  **Scope Verification:** Look at the attached files. If the user lists "Finish Project" (1 hr), but the file is a complex 20-page spec, you MUST flag this as delusional and break it down (e.g., "Draft Section 1 only").
2.  **Energy Audit:** If the user schedules deep coding/writing during the "Post-Lunch Dip" (1 PM - 3 PM), move it. That time is for low-leverage tasks only.
3.  **Buffer Enforcement:** If the plan has 0 minutes of buffer/transition time, it will fail. Insert buffers.
4.  **Specificity Check:** Vague tasks = Procrastination. Change "Study Aptitude" to "Solve 10 Profit/Loss Problems" (based on the file content).

# OUTPUT FORMAT

## Part 1: The Brutal Audit (Bullet Points)
* Identify exactly where the user is underestimating effort or overestimating energy.
* Call out "Fake Productivity" (tasks that feel good but move no needles).

## Part 2: The Optimized "Sticky Note" Plan
Rewrite the list following these strict formatting rules:
1.  **Chronological Order:** Wake up -> Wind down.
2.  **Format:** \`[#] [Action Verb] [Specific Output] [Duration]\`
3.  **Visuals:** Use the exact "Sticky Note" style (simple, handwritten vibe).
4.  **Constraints:**
    * Max 3 "Deep Work" blocks.
    * Mandatory "Lunch + Reset" block.
    * Total focused work capped at 6 hours.

---
# USER INPUT DATA

**Time Now:** ${new Date()}
**Location:** Nagpur, Maharashtra, India
`;

    const userMessage = `User Context:\n${context}\n\nTodo to analyze: "${todoText}"\n\nProvide JSON response with: relevance (0-100), reasoning (string), and suggestions (array of strings).`;

    try {
      const response = await googleGenAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      });
      if (!response.text) {
        return {
          relevance: 50,
          reasoning: "Unable to analyze due to error",
          suggestions: []
        };
      }
      let jsonResponse = JSON.parse(response.text)
      const improved_todo = jsonResponse.improved_todo.split(";")
      jsonResponse = { ...jsonResponse, improved_todo: improved_todo }
      return jsonResponse;
    } catch (error) {
      return {
        relevance: 50,
        reasoning: "Unable to analyze due to error",
        suggestions: []
      };
    }

  }
}
export default AIContextService