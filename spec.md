# Capture Advance

## Current State

Full-stack trading signal analyzer with:
- Backend (Motoko): saves signals, outcomes, and user settings
- Frontend: countdown panel, BUY/SELL signal display with neon glow, RSI/EMA indicators, screen capture tool (getDisplayMedia + crop overlay), capture thumbnail shown above ANÁLISE IA block, Binance live data for crypto pairs, simulated data for forex pairs

## Requested Changes (Diff)

### Add
- After the user captures and crops a chart screenshot, automatically send the image to the Gemini Vision API (Google Generative Language API, model `gemini-1.5-flash`) via HTTP outcall from the frontend (using fetch directly, no backend change needed — the API key is embedded in the frontend env or hardcoded)
- The Gemini prompt should instruct the model to analyze the chart image as a financial analyst would: identify trend direction (bullish/bearish/neutral), support/resistance levels visible in the ordinates (Y-axis), candlestick patterns, and give a BUY or SELL recommendation with a confidence percentage
- Display the Gemini Vision response inside the ANÁLISE IA block, replacing the current text-based RSI/EMA analysis when a capture is present
- Show a loading state ("GEMINI ANALISANDO...") while awaiting the API response
- If Gemini returns a BUY or SELL recommendation, update the signal state (BUY/SELL glow on buttons) accordingly
- If the API call fails, show an error message and fall back to the existing RSI/EMA text analysis

### Modify
- `ScreenCapture.tsx`: After `onCapture(dataUrl)` is called, also trigger a new `onCaptureAnalyze(dataUrl)` callback
- `SignalPanel.tsx`: Accept a `geminiAnalysis` prop (string | null) and `isGeminiAnalyzing` (boolean); when set, show the Gemini response text instead of the computed AIAnalysisText; show a "GEMINI" badge next to "ANÁLISE IA" label
- `App.tsx`: Add `analyzeWithGemini(dataUrl)` function that calls the Gemini Vision REST API, parses the result, updates signal state if BUY/SELL is found

### Remove
- Nothing removed

## Implementation Plan

1. In `App.tsx`, add `geminiAnalysis` (string | null) and `isGeminiAnalyzing` (boolean) state
2. Add `analyzeWithGemini(dataUrl: string)` async function that:
   a. Sets `isGeminiAnalyzing = true`, `geminiAnalysis = null`
   b. Converts the dataUrl to base64 (strip the `data:image/png;base64,` prefix)
   c. Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDemo` (use env var `VITE_GEMINI_API_KEY` if available, else show a config error)
   d. Sends a multipart request with the image and a financial analysis prompt in Portuguese
   e. Parses the response text; looks for "BUY" or "SELL" (case-insensitive / "COMPRA"/"VENDA") to set signal direction
   f. Sets `geminiAnalysis` to the full response text
   g. Sets `isGeminiAnalyzing = false`
3. When `setCaptureDataUrl` is called, also call `analyzeWithGemini(url)`
4. Pass `geminiAnalysis` and `isGeminiAnalyzing` to `SignalPanel`
5. In `SignalPanel.tsx`, when `isGeminiAnalyzing` is true show a "GEMINI ANALISANDO..." spinner with yellow Brain icon; when `geminiAnalysis` is set, display the text with a green "GEMINI" badge; otherwise show the existing RSI/EMA text
6. Add the `VITE_GEMINI_API_KEY` environment variable usage with a clear fallback message if not set
