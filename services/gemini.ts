/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Using gemini-3-pro-preview for complex tasks with thinking.
const GEMINI_MODEL = 'gemini-3-pro-preview';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert AI Engineer and Product Designer specializing in "bringing artifacts to life".
Your goal is to take a user uploaded file—which might be a polished UI design, a messy napkin sketch, a photo of a whiteboard with jumbled notes, or a picture of a real-world object (like a messy desk)—and instantly generate a fully functional, interactive, single-page HTML/JS/CSS application.

CORE DIRECTIVES:
1. **Analyze & Abstract**: Look at the image.
    - **Sketches/Wireframes**: Detect buttons, inputs, and layout. Turn them into a modern, clean UI.
    - **Real-World Photos (Mundane Objects)**: If the user uploads a photo of a desk, a room, or a fruit bowl, DO NOT just try to display it. **Gamify it** or build a **Utility** around it.
      - *Cluttered Desk* -> Create a "Clean Up" game where clicking items (represented by emojis or SVG shapes) clears them, or a Trello-style board.
      - *Fruit Bowl* -> A nutrition tracker or a still-life painting app.
    - **Documents/Forms**: specific interactive wizards or dashboards.

2. **NO EXTERNAL IMAGES**:
    - **CRITICAL**: Do NOT use <img src="..."> with external URLs (like imgur, placeholder.com, or generic internet URLs). They will fail.
    - **INSTEAD**: Use **CSS shapes**, **inline SVGs**, **Emojis**, or **CSS gradients** to visually represent the elements you see in the input.
    - If you see a "coffee cup" in the input, render a ☕ emoji or draw a cup with CSS. Do not try to load a jpg of a coffee cup.

3. **Make it Interactive**: The output MUST NOT be static. It needs buttons, sliders, drag-and-drop, or dynamic visualizations.
4. **Self-Contained**: The output must be a single HTML file with embedded CSS (<style>) and JavaScript (<script>). No external dependencies unless absolutely necessary (Tailwind via CDN is allowed).
5. **Robust & Creative**: If the input is messy or ambiguous, generate a "best guess" creative interpretation. Never return an error. Build *something* fun and functional.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Do not wrap it in markdown code blocks (\`\`\`html ... \`\`\`). Start immediately with <!DOCTYPE html>.`;

const REFINE_SYSTEM_INSTRUCTION = `You are an expert Frontend Developer.
You will be given the full source code of a single-page HTML application and a user instruction to modify it.

YOUR TASK:
1. Apply the user's requested changes to the code.
2. Fix any obvious bugs you see while you are there.
3. Ensure the code remains self-contained (HTML+CSS+JS in one file).
4. Do NOT output explanations. Output ONLY the fully updated raw HTML code.
5. Start immediately with <!DOCTYPE html>.`;

const ANALYSIS_SYSTEM_INSTRUCTION = `You are a Senior Staff Software Engineer conducting a code review.
Analyze the provided HTML/CSS/JS code.
Focus on:
1. Code Quality & Cleanliness
2. Performance & Efficiency
3. Modern Best Practices (ES6+, Semantic HTML)
4. Potential bugs or edge cases
5. Accessibility

Format your response as a concise Markdown report. Keep it constructive and helpful.`;

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const parts: any[] = [];
  
  // Construct the prompt, integrating user instructions if provided
  let textPart = "";
  if (fileBase64) {
      const defaultFilePrompt = "Analyze this image/document. Detect what functionality is implied. If it is a real-world object (like a desk), gamify it (e.g., a cleanup game). Build a fully interactive web app. IMPORTANT: Do NOT use external image URLs. Recreate the visuals using CSS, SVGs, or Emojis.";
      textPart = defaultFilePrompt;
      if (prompt && prompt.trim()) {
          textPart += `\n\nUSER REQUEST / CONTEXT: ${prompt}`;
      }
  } else {
      textPart = prompt || "Create a demo app that shows off your capabilities.";
  }

  parts.push({ text: textPart });

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Enable Thinking Mode for complex reasoning
        thinkingConfig: { thinkingBudget: 32768 }, 
        temperature: 0.5, 
      },
    });

    let text = response.text || "<!-- Failed to generate content -->";

    // Cleanup if the model still included markdown fences despite instructions
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

export async function refineApp(currentHtml: string, instruction: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { text: "Here is the current existing code:" },
          { text: currentHtml },
          { text: `\n\nUSER INSTRUCTION: ${instruction}\n\nReturn the full updated HTML file.` }
        ]
      },
      config: {
        systemInstruction: REFINE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 8192 }, // Lower budget for quick edits
        temperature: 0.3,
      },
    });

    let text = response.text || currentHtml;
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Refinement Error:", error);
    throw error;
  }
}

export async function analyzeCode(code: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { text: "Please analyze this code and suggest improvements:" },
          { text: code }
        ]
      },
      config: {
        systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
        // Enable Thinking Mode for code analysis as well
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Failed to analyze code. Please try again.";
  }
}