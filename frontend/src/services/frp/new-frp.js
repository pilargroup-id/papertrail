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
  },
  uploadAttachment: async (id, file) => {
    const formData = new FormData()
    formData.append('attachment', file)
    const response = await fetch(`/api/frp/${id}/attachment`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to upload attachment')
    }
    return await response.json()
  }
}