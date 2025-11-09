



export async function getDedalusResponse(prompt: string): Promise<string> {


    const finalPrompt = `You are a helpful assistant that can help with tasks. You are given a prompt and you need to respond with a description of the task. The prompt is: ${prompt}. don't expect any response from the user for clarification. Just complete the task. The current date is ${new Date().toISOString()}.`;
    const response = await fetch('http://localhost:8000/api/dedalus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: finalPrompt
        })
      });
      
      const { status, description } = await response.json();
      console.log(status, description);

      return description;
}