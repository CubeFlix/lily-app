import { Channels } from 'main/preload';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, args: unknown[]): void;
        on(
          channel: Channels,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
        once(channel: Channels, func: (...args: unknown[]) => void): void;
      };
    };
    api: {
      connect(address: string, port: Number, allowUnauthorizedHosts: boolean): Promise<any>;
      disconnect(): Promise<any>;
      login(username: string, password: string): Promise<any>;
      logout(): Promise<any>;
      command(name: string, args: any): Promise<any>;
      download(drive: string, path: string): Promise<any>;
      downloadPath(drive: string, path: string): Promise<any>;
      upload(drive: string, path: string): Promise<any>;
    }
  }
}

export {};
