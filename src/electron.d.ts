export {};

declare global {
  interface Window {
    novaSecureStore?: {
      saveGeminiKey(key: string): Promise<{ saved: boolean; reason?: string }>;
      getGeminiKey(): Promise<string>;
      hasGeminiKey(): Promise<boolean>;
    };
  }
}
