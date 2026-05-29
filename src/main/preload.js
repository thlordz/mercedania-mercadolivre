const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mercadoApp', {
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  stats: () => ipcRenderer.invoke('stats:get'),
  anuncios: (filters) => ipcRenderer.invoke('anuncios:list', filters),
  promocoes: (filters) => ipcRenderer.invoke('promocoes:list', filters),
  vendas: (filters) => ipcRenderer.invoke('vendas:list', filters),
  atualizarAnuncio: (payload) => ipcRenderer.invoke('anuncios:update', payload),
  atualizarPromocao: (payload) => ipcRenderer.invoke('promocoes:update', payload),
  criarVenda: (payload) => ipcRenderer.invoke('vendas:create', payload),
  excluirVenda: (id) => ipcRenderer.invoke('vendas:delete', id),
});