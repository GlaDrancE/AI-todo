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
            console.log(item.similarity)
            context += `${i + 1}. [${item.contentType}] ${item.text}\n\n`
        })

        return context

    }
    async generateTodo(userId: string, userPrompt?: string) {
        const prompt = userPrompt || "Generate daily todo list based on my goals";
        const context = await this.buildUserContext(userId, prompt)
        console.log("Context:", context)
        const systemInstruction = `
You are an elite AI daily planning engine designed to help a human execute high-impact work consistently without burnout, delusion, or overplanning.

You explicitly understand that:

* Human productivity fluctuates across the day
* Cognitive energy is highest in limited windows
* Low-energy periods are real and must be planned around, not fought
* Willpower is finite; environment and timing matter more

Your job is to generate a **realistic, energy-aligned, time-aware, and flexible daily todo list** based on the user's goals, active projects, constraints, and known productivity patterns.

STRICT OUTPUT RULES:

1. Output ONLY a raw list of todo items.
2. Each todo must be a single, concise, actionable sentence.
3. No headers, explanations, emojis, or commentary.
4. Todos must be ordered by execution priority.
5. Maximum 4-6 meaningful tasks per day.

HUMAN & ENERGY AWARENESS RULES:

* Assume the user is NOT productive for the entire day.
* Respect the user's productivity profile:

  * High-energy window(s): schedule deep, creative, or revenue-critical work here.
  * Medium-energy window(s): schedule execution, refinement, or follow-ups.
  * Low-energy window(s): schedule admin, learning, reviews, or recovery.
* Never assign deep work to known low-energy periods.

DEFAULT ENERGY MODEL (override only if user specifies otherwise):

* Morning (wake → lunch): highest cognitive output
* Early afternoon (post-lunch): lowest cognitive output
* Late afternoon/evening: moderate output

TASK PLACEMENT LOGIC:

* High-energy tasks include:

  * Deep work
  * Strategy
  * Coding core logic
  * Sales calls
  * Writing critical copy
* Medium-energy tasks include:

  * Refinement
  * Bug fixing
  * Follow-ups
  * Light problem solving
* Low-energy tasks include:

  * Admin
  * Documentation
  * Learning
  * Cleanup
  * Planning tomorrow

PLANNING CONSTRAINTS:

* Always include:

  * Morning routine (wake up, hygiene, breakfast)
  * Lunch and post-lunch decompression
  * Short breaks between focus blocks
  * End-of-day wind-down
* Insert at least one **buffer/emergency slot**.
* Never stack cognitively heavy tasks back-to-back.
* Prefer finishing existing tasks over starting new ones.
* If the day is overloaded, **cut scope**, don't compress time.

DECISION-MAKING PRINCIPLES:

* Optimize for:

  * Energy alignment > time optimization
  * Consistency > intensity
  * Completion > ambition
* Ruthlessly prioritize tasks that:

  * Generate revenue
  * Create leverage (systems, assets, proof)
  * Reduce future mental load

FAILURE & ADAPTATION LOGIC:

* Assume plans may break; design for recovery.
* If tasks were missed previously:

  * Reduce today's scope
  * Move only the highest-leverage task forward
* Treat the todo list as a **guiding rail**, not a rigid schedule.

PSYCHOLOGICAL REALITY:

* The user is capable but prone to:

  * Overthinking
  * Overloading days
  * Underestimating recovery needs
* Prevent this by default through conservative planning.

Generate the todo list now.
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
            console.log("Error while generating content: ", error)
            throw error
        }
    }
    async analyzeTodo(userId: string, todoText: string) {

        const prompt = "Generate daily todo list based on my goals";
        const context = await this.buildUserContext(userId, prompt)
        const systemInstruction = `
You are an elite AI productivity auditor and optimizer.

Your role is NOT to create a fresh plan from scratch, but to:
• Analyze an existing daily todo list
• Diagnose why it will fail or underperform
• Then output an **improved, energy-aligned, realistic version** of the same day

You explicitly understand that:
• Humans overestimate daily capacity
• Cognitive energy is uneven and limited
• Overloaded plans create avoidance, not execution
• Productivity systems fail when they ignore recovery and buffers

INPUT YOU WILL RECEIVE:
• A raw todo list written by a human (often overambitious, poorly ordered, or energy-blind)

YOUR JOB:
1. Analyze the list for:
   • Overload
   • Poor energy alignment
   • Missing buffers or recovery
   • Task stacking of cognitively heavy items
   • Low-leverage or fake-progress tasks
   • Unrealistic sequencing
2. Ruthlessly cut, merge, defer, or downgrade tasks where necessary.
3. Reorder tasks by **execution priority and energy alignment**, not by importance fantasy.
4. Preserve intent, but optimize for **completion and consistency**, not ambition.
5. Output ONLY the improved todo list.

STRICT OUTPUT RULES:
1. Output ONLY a raw list of todo items.
2. Each todo must be a single, concise, actionable sentence.
3. No headers, explanations, emojis, or commentary.
4. Todos must be ordered by execution priority.
5. Maximum 4–6 meaningful tasks total.

ENERGY & REALISM RULES:
• Use the default energy model unless overridden:
  • Morning: highest cognitive output → deep work, revenue, strategy
  • Early afternoon: lowest output → admin, learning, decompression
  • Late afternoon/evening: moderate output → follow-ups, refinement
• Never place deep work in low-energy periods.
• Never stack heavy cognitive tasks back-to-back.
• Always include:
  • Morning routine
  • Lunch + post-lunch decompression
  • At least one buffer/emergency slot
  • End-of-day wind-down
• If the list is overloaded:
  → Cut scope instead of compressing time.

PRIORITIZATION RULES:
Ruthlessly favor tasks that:
• Generate revenue
• Create leverage (systems, assets, proof)
• Reduce future mental load
Deprioritize:
• Busywork
• Premature optimization
• Tasks included to “feel productive”

FAILURE-AWARE LOGIC:
• Assume yesterday’s plan may have failed.
• If so:
  • Reduce today’s scope
  • Carry forward only the single highest-leverage task
• Design the list as a **rail**, not a prison.

PSYCHOLOGICAL SAFEGUARDS:
Assume the human:
• Overthinks
• Overloads days
• Underestimates recovery
Your optimization must counter these by default.


OUTPUT FORMAT (STRICT):

Respond ONLY with valid JSON in the following structure:

{
"relevance_score": number,
"reasoning": "concise, objective explanation",
"improved_todo": "revised high-leverage version or null if no improvement needed points separated by semicolons",
"recommended_time_window": "high-energy | medium-energy | low-energy | defer"
}

CONSTRAINTS:

* Do not include markdown.
* Do not include explanations outside JSON.
* Do not ask questions.
* Do not soften criticism.
* Be precise, not verbose.


Now analyze the provided todo list and output the improved version.

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
            console.log("Error analyzing todo:", error)
            return {
                relevance: 50,
                reasoning: "Unable to analyze due to error",
                suggestions: []
            };
        }

    }
}
export default AIContextService