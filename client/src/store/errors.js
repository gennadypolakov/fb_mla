import axios from 'axios';

export default {
  state: {
    errors: {},
    errorsArray: []
  },
  mutations: {
    errors(state, payload) {
      state.errorsArray = Object.keys(payload);
      state.errors = payload;
    }
  },
  actions: {
    errors({commit, rootState}) {
      commit('clearError');
      commit('setLoading', true);
      axios.get(`${window.location.protocol}//${window.location.host}/api/errors/${rootState.shared.authToken}`)
        .then(response => {
          if(response.data) {
            commit('errors', response.data);
          }
          commit('setLoading', false);
        })
        .catch((e) => {
          commit('setLoading', false);
          commit('setError', e.message);
        });
    }
  }
};
