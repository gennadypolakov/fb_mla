import axios from 'axios';

export default {
  state: {
    uploadingStatus: [],
    dataSent: false
  },
  mutations: {
    uploadingStatus(state, payload) {
      state.uploadingStatus = payload;
    },
    dataSent(state, payload) {
      state.dataSent = payload;
    }
  },
  actions: {
    uploadingStatus({commit}, result) {
      commit('uploadingStatus', result);
    },
    sendData({commit, rootState}, {files, route, type}) {
      commit('dataSent', false);
      commit('clearError');
      commit('setLoading', true);
      if(files.length > 0) {
        let formData = new FormData();
        formData.append('authToken', rootState.shared.authToken);
        if (type) {
          formData.append('type', type);
        }
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
        let config = {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        };
        axios.post(
          `${window.location.protocol}//${window.location.host}/api/upload/${route}`,
          formData
          // config
        ).then(response => {
          if(response.data && response.data.length > 0) {
            commit('uploadingStatus', response.data);
            commit('setLoading', false);
            commit('dataSent', true);
          }
        })
          .catch((e) => {
            commit('setLoading', false);
            commit('setError', e.message);
          });
      }
    },
    dataSent({commit}, status) {
      commit('dataSent', status);
    }
  }
};
