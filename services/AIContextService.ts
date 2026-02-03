import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai"
const googleGenAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY as string });
class AIContextService {
    async buildUserContext(userId: string): Promise<string> {
        const profile = await prisma.userProfile.findUnique({
            where: {
                userId
            }
        })
        const contextFiles = await prisma.contextFile.findMany({
            where: {
                userId
            }
        })

        let context = `# User Profile\n\n`
        if (profile) {
            context += `## Who I Am\n${profile.whoIAm || 'Not specified'}\n\n`;
            context += `## What I Want to Achieve\n${profile.whatIWantToAchieve || 'Not specified'}\n\n`;
            context += `## What I Want in Life\n${profile.whatIWantInLife || 'Not specified'}\n\n`;
        }

        context += `# Context Files\n\n`;

        for (const file of contextFiles) {
            context += `## ${file.name} (${file.type})\n`;
            context += `${file.extractedText || 'Content not extracted'}\n\n`;
        }
        return context;

    }
    async generateTodo(userId: string, userPrompt?: string) {
        const context = await this.buildUserContext(userId)
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

        const context = await this.buildUserContext(userId)
        const systemInstruction = `
You are a high-precision task evaluation engine.

Your job is to analyze a single todo item and determine how well it aligns with the user's goals, active projects, constraints, energy patterns, and current phase of execution.

You must operate with ruthless objectivity. Do not assume the todo is useful just because it exists.

ANALYSIS RULES:

* Evaluate alignment with:

  * The user's stated goals
  * Ongoing projects and deadlines
  * Current priorities and bottlenecks
  * Known productivity patterns and energy windows
* Penalize todos that are:

  * Vague or non-actionable
  * Low leverage or busywork
  * Poorly timed for the user's energy profile
  * Redundant with higher-priority tasks
* Reward todos that:

  * Drive revenue, proof of work, or momentum
  * Reduce future cognitive load
  * Clearly move an active project forward
  * Can realistically be completed in one focused session

SCORING:

* Output a relevance score from 0-100.
* 90-100: Directly advances a top priority right now.
* 70-89: Useful but could be better scoped or timed.
* 40-69: Marginal value or misaligned with current priorities.
* 0-39: Noise, distraction, or avoidance disguised as work.

IMPROVEMENT LOGIC:

* If the todo is weak, rewrite it into a higher-leverage version.
* If the todo is too large, reduce it to the single next concrete action.
* If the todo is mistimed, suggest a version aligned to the user's energy window.
* If the todo should not be done today, say so explicitly.

OUTPUT FORMAT (STRICT):

Respond ONLY with valid JSON in the following structure:

{
"relevance_score": number,
"reasoning": "concise, objective explanation",
"improved_todo": "revised high-leverage version or null if no improvement needed",
"recommended_time_window": "high-energy | medium-energy | low-energy | defer"
}

CONSTRAINTS:

* Do not include markdown.
* Do not include explanations outside JSON.
* Do not ask questions.
* Do not soften criticism.
* Be precise, not verbose.

Evaluate the todo item now.

        `;

        const userMessage = `User Context:\n${context}\n\nTodo to analyze: "${todoText}"\n\nProvide JSON response with: relevance (0-100), reasoning (string), and suggestions (array of strings).`;

        try {
            const response = await googleGenAI.models.generateContent({
                model: 'gemini-2.5-flash-preview',
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
            return text;
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