// Mock API service for AI agent interactions
// This will be replaced with real API calls once the backend is available

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessage = async (message) => {
    // Simulate network delay
    await delay(1500);

    // Mock response
    return {
        role: 'assistant',
        content: `This is a mock response to: "${message}". The actual API integration will replace this with real agent responses.`
    };
};

// Future integration point for real API
export const connectToAgentAPI = async (apiUrl, message) => {
    // TODO: Replace with actual API call
    // const response = await fetch(apiUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message })
    // });
    // return response.json();

    return sendMessage(message);
};
