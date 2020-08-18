import axios from 'axios';
import router from '../router';


export default {
  state: {
    loading: false,
    error: null,
    authToken: null,
    wsAuth: null,
    ws: null
  },
  mutations: {
    setAuth(state, payload) {
      state.authToken = payload;
    },
    setWsAuth(state, payload) {
      state.wsAuth = payload;
    },
    setWs(state, payload) {
      state.ws = payload;
    },
    setLoading(state, payload) {
      state.loading = payload;
    },
    setError(state, payload) {
      state.error = payload;
    },
    clearError(state) {
      state.error = null;
    },
    exit(state) {
      state.authToken = null;
      localStorage.removeItem('authToken');
    }
  },
  actions: {
    setLoading({ commit }, payload) {
      commit('setLoading', payload);
    },
    setError({ commit }, payload) {
      commit('setError', payload);
    },
    clearError({ commit }) {
      commit('clearError');
    },
    setAuth({ commit, dispatch }, authToken = null) {
      if (authToken) {
        localStorage.setItem('authToken', authToken);
        commit('setAuth', authToken);
        dispatch('setWsConnect', { authToken });
        dispatch('getProfiles')
          .then(() => router.push('/'));
      } else if (!localStorage.getItem('authToken')) {
        router.push('/login');
      } else {
        const authToken = localStorage.getItem('authToken');
        commit('setAuth', authToken);
        dispatch('setWsConnect', { authToken });
        dispatch('getProfiles')
          .then(() => router.push('/'));
      }
    },
    setWsConnect({ commit, rootState, dispatch }, data) {
      if (!rootState.shared.ws) {
        let ws;
        try {
          ws = new WebSocket(`ws://${window.location.hostname}:33000/`);
        } catch (e) {
          setTimeout(() => dispatch('setWsConnect', data), 1000);
        }
        ws.onopen = (e) => {
          ws.send(JSON.stringify(data));
          if (!ws.onmessage) {
            ws.onmessage = (msg) => dispatch('wsMsg', msg);
          }
          if (!ws.onerror) {
            ws.onerror = (e) => {
              if (e.code === 'ECONNREFUSED' || e.code === 'ERR_CONNECTION_REFUSED') {
                setTimeout(() => dispatch('setWsConnect', data), 1000);
              }
            };
          }
          if (!ws.onclose) {
            ws.onclose = (e) => {
              console.log('ws.onclose', e);
              commit('setWs', null);
              commit('setWsAuth', null);
              dispatch('setWsConnect', data);
            }
          }
          commit('setWs', ws);
        };
      }
    },
    send({ commit, rootState, dispatch }, data) {
      if (rootState.shared.wsAuth) {
        try {
          rootState.shared.ws.send(JSON.stringify(data));
        } catch (e) {
          commit('setWsAuth', null);
          commit('setWs', null);
          if (rootState.shared.authToken) {
            dispatch('setWsConnect', { authToken: rootState.shared.authToken, ...data });
          }
        }
      } else {
        commit('setWs', null);
        if (rootState.shared.authToken) {
          dispatch('setWsConnect', { authToken: rootState.shared.authToken, ...data });
        }
      }
    },
    wsMsg({ commit, dispatch, rootState }, msg) {
      console.log(msg);
      if (msg && msg.data) {
        const data = JSON.parse(msg.data);
        if (data) {
          if (data.authToken && data.authToken === rootState.shared.authToken) {
            commit('setWsAuth', data.authToken);
          }
          if (data.action && rootState.shared.wsAuth) {
            const action = data.action;
            if (action === 'shareProfiles' && data.profiles) {
              commit('profilesLoaded', data.profiles);
            }
          }
        }
      }
    },
    login({ commit, dispatch }, password) {
      commit('clearError');
      commit('setLoading', true);
      axios.post(`${window.location.protocol}//${window.location.host}/api/login`, { password })
        .then((response) => {
          if (response.data && response.data.status === 'ok') {
            dispatch('setAuth', response.data.authToken);
          } else {
            commit('setLoading', false);
          }
        })
        .catch((error) => {
          commit('setLoading', false);
          commit('setError', error.message);
        });
    },
    exit({ commit }) {
      commit('exit');
    }
  },
  getters: {
    error(state) {
      return state.error;
    }
  }
}
