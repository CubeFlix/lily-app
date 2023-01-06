import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
});

contextBridge.exposeInMainWorld('api', {
  connect: (address: string, port: Number, allowUnauthorizedHosts: boolean) => ipcRenderer.invoke('api-connect', 
    {address: address, port: port, allowUnauthorizedHosts: allowUnauthorizedHosts}),
  disconnect: () => ipcRenderer.invoke('api-disconnect'),
  login: (username: string, password: string) => ipcRenderer.invoke('api-login', 
    {username: username, password: password}),
  logout: () => ipcRenderer.invoke('api-logout'),
  command: (name: string, args: any) => ipcRenderer.invoke('api-command', 
    {name: name, args: args}),
  download: (drive: string, path: string) => ipcRenderer.invoke('api-download', {drive: drive, path: path}),
  downloadPath: (drive: string, path: string) => ipcRenderer.invoke('api-download-path', {drive: drive, path: path}),
  upload: (drive: string, path: string) => ipcRenderer.invoke('api-upload', {drive: drive, path: path})
});
