import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

// --- Basic Server Setup ---
dotenv.config(); // This is for local development, Vercel uses its own system
const app = express();

// --- Get Current Directory Path ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * --- API Endpoint: /api/recommendation ---
 */
app.post('/api/recommendation', async (req, res) => {
    // This log is very helpful for debugging on Vercel.
    // You can view it in your project's "Functions" tab on the Vercel dashboard.
    console.log("Received request on server with body:", req.body);

    const { machine, grinder, beans } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- Input validation ---
    if (!apiKey) {
        console.error("Server configuration error: GEMINI_API_KEY is not configured on Vercel.");
        return res.status(500).json({ error: "Server configuration error. The API key is missing." });
    }
    
    if (!machine || !grinder || !beans) {
        console.error("Validation failed. One or more fields are missing.", { machine, grinder, beans });
        return res.status(400).json({ error: "Please provide all required fields: machine, grinder, and beans." });
    }

    // --- Corrected Prompt (from previous turn) ---
    const prompt = `
    You are an expert barista and coffee consultant with web search capabilities. Your task is to provide a starting grind setting recommendation based on a user's coffee setup.

    User's Setup:
    - Grinder: "${grinder}"
    - Coffee Beans: "${beans}"
    - Brew Method / Machine: "${machine}"

    Instructions:
    1.  Perform a targeted web search to find information, guides, and forum discussions related to this specific combination of grinder, beans, and brew method.
    2.  Analyze the search results to find a consensus or a common starting point for the grind size.
    3.  Provide a single, actionable starting grind setting.
    4.  Synthesize a brief summary explaining your reasoning. Mention how factors like roast level or bean density, if available in the search, influenced your recommendation.
    5.  List the top 3 most relevant sources you used, including their title, URL, and a relevant snippet.

    Respond with ONLY a valid JSON object in the following format. Do not include any text, markdown formatting, or code fences outside of the JSON object.

    {
      "recommendedSetting": "Your recommended setting (e.g., '18', '4.2', '22 clicks')",
      "unit": "The unit for the setting (e.g., 'clicks from zero', 'main clicks', 'numbered setting')",
      "confidence": "Your confidence in the recommendation ('High', 'Medium', or 'Low')",
      "summary": "Your brief summary and reasoning.",
      "sources": [
        {
          "title": "Source 1 Title",
          "url": "http://example.com/source1",
          "snippet": "A relevant quote or snippet from the source."
        },
        {
          "title": "Source 2 Title",
          "url": "http://example.com/source2",
          "snippet": "A relevant quote or snippet from the source."
        },
        {
          "title": "Source 3 Title",
          "url": "http://example.com/source3",
          "snippet": "A relevant quote or snippet from the source."
        }
      ]
    }
    `;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            throw new Error(`API request failed with status ${apiResponse.status}: ${errorBody}`);
        }

        const data = await apiResponse.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const jsonText = data.candidates[0].content.parts[0].text;
            try {
                const parsedJson = JSON.parse(jsonText);
                res.json(parsedJson);
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                console.error('Received text that failed to parse:', jsonText);
                throw new Error("The AI returned a response that was not valid JSON.");
            }
        } else {
            console.error('Unexpected API response structure:', JSON.stringify(data, null, 2));
            throw new Error("The AI returned an empty or invalid response.");
        }

    } catch (error) {
        console.error('Error in /api/recommendation:', error);
        res.status(500).json({ error: error.message || 'Failed to get recommendation from the AI.' });
    }
});

// --- CRITICAL CHANGE FOR VERCEL ---
// This line allows Vercel to import your Express app as a serverless function.
export default app;
