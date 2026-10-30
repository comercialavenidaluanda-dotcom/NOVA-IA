export {};

type NovaProvider = "google" | "openai" | "anthropic";
declare global {
  interface Window {
    novaSecureStore?: {
      saveApiKey(provider: NovaProvider, key: string): Promise<{ saved: boolean; reason?: string }>;
      getApiKey(provider: NovaProvider): Promise<string>;
      hasApiKey(provider: NovaProvider): Promise<boolean>;
      deleteApiKey(provider: NovaProvider): Promise<{ deleted: boolean }>;
      saveGeminiKey(key: string): Promise<{ saved: boolean; reason?: string }>;
      getGeminiKey(): Promise<string>;
      hasGeminiKey(): Promise<boolean>;
    };
  }
}
