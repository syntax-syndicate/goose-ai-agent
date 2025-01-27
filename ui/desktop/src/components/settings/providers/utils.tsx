export const special_provider_cases = {
  Ollama: async () => await checkForOllama(), // Dynamically re-check
};

export async function checkForOllama() {
  console.log('Invoking check-ollama IPC handler...');
  try {
    const ollamaInstalled = await window.electron.checkForOllama();
    console.log('Is Ollama running (from renderer)?', ollamaInstalled);
    return ollamaInstalled;
  } catch (error) {
    console.error('Error invoking check-ollama:', error);
    return false;
  }
}
