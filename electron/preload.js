const { contextBridge, ipcRenderer } = require('electron')

// Helper: unwrap the {ok, data, error} envelope — throws on backend error
async function invoke(channel, ...args) {
  const res = await ipcRenderer.invoke(channel, ...args)
  if (res && res.ok === false) throw new Error(res.error || 'Unknown error')
  return res && 'data' in res ? res.data : res
}

contextBridge.exposeInMainWorld('electronAPI', {
  config: {
    getAll:  ()           => invoke('config:getAll'),
    update:  (key, value) => invoke('config:update', key, value),
  },
  vegetables: {
    getAll:  ()     => invoke('vegetables:getAll'),
    add:     (data) => invoke('vegetables:add', data),
    update:  (data) => invoke('vegetables:update', data),
    delete:  (id)   => invoke('vegetables:delete', id),
  },
  clients: {
    getAll:  ()     => invoke('clients:getAll'),
    add:     (data) => invoke('clients:add', data),
    update:  (data) => invoke('clients:update', data),
    delete:  (id)   => invoke('clients:delete', id),
  },
  vendors: {
    getAll:  ()     => invoke('vendors:getAll'),
    add:     (data) => invoke('vendors:add', data),
    update:  (data) => invoke('vendors:update', data),
    delete:  (id)   => invoke('vendors:delete', id),
  },
  transactions: {
    save:           (data)            => invoke('transactions:save', data),
    getAll:         ()                => invoke('transactions:getAll'),
    getByDate:      (date)            => invoke('transactions:getByDate', date),
    getById:        (id)              => invoke('transactions:getById', id),
    getClientBills: (clientId, date)  => invoke('transactions:getClientBills', clientId, date),
    getVendorBills: (vendorId, date)  => invoke('transactions:getVendorBills', vendorId, date),
  },
  db: {
    clearData: () => invoke('db:clearData'),
    getPath:   () => invoke('db:getPath'),
  },
  app: {
    pickLogo: async () => {
      const res = await ipcRenderer.invoke('app:pickLogo')
      if (res && res.ok === false) throw new Error(res.error || 'Failed to pick logo')
      return res && 'data' in res ? res.data : null
    },
  },
  print: {
    bill: () => ipcRenderer.invoke('print:bill'),
  },
})
