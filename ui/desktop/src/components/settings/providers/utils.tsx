export const special_provider_cases = {
  Ollama: checkForOllama(), // Set the check result here
};

export async function checkForOllama() {
  const ollamaInstalled = await window.electron.checkForOllama();
  console.log('Is ollama installed?', ollamaInstalled);
  return ollamaInstalled;
}
