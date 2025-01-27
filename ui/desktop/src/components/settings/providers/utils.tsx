export const special_provider_cases = {
  ollama: checkForOllama(), // Set the check result here
};

export async function checkForOllama() {
  const ollamaInstalled = await window.electron.checkForOllama();
  console.log('Is ollama installed?', ollamaInstalled);
  return ollamaInstalled;
}
