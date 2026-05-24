import api from '../api'

export const frpService = {
  getFormData: async (query = '') => {
    return await api.get(`/api/form-data${query}`)
  },
  
  getRpData: async (rpId) => {
    return await api.get(`/api/rp/${rpId}`)
  },
  
  getKurs: async (currency) => {
    return await api.get(`/api/kurs/${currency}`)
  },
  
  saveFrp: async (payload) => {
    return await api.post('/api/frp/save', payload)
  }
}