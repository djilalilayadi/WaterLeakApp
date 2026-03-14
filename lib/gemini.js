import supabase from './supabase';

const FALLBACK_RESULT = {
    severity: 'unknown',
    description: 'Could not analyze',
    estimated_flow: 'unknown',
};

/**
 * Analyze a leak image by calling the Supabase Edge Function.
 * The Gemini API key stays server-side — never exposed to the client.
 *
 * @param {string} imageUrl - Public URL of the image in Supabase Storage
 * @returns {Promise<{severity: string, description: string, estimated_flow: string}>}
 */
export async function analyzeLeakImage(imageUrl) {
    try {
        const { data, error } = await supabase.functions.invoke('analyze-leak', {
            body: { imageUrl },
        });

        if (error) {
            console.error('[Gemini] Edge Function error:', error.message);
            return FALLBACK_RESULT;
        }

        return {
            severity: data?.severity || 'unknown',
            description: data?.description || 'No description provided',
            estimated_flow: data?.estimated_flow || 'unknown',
        };
    } catch (error) {
        console.error('[Gemini] Analysis failed:', error.message);
        return FALLBACK_RESULT;
    }
}
