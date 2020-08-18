import axios from 'axios';

export default {
  state: {
    profiles: {},
    profilesArr: [],
    createdNumProfiles: 0,
    numAccounts2Profiles: 0,
    profilesLoaded: false,
    status: {
      accountsInProgress: 0,
      handledAccounts: 0,
      accounts: 0
    }
  },
  mutations: {
    createProfile(state, { profiles, createdNumProfiles }) {
      state.profiles = profiles;
      state.createdNumProfiles = createdNumProfiles;
    },
    setStatus(state, status) {
      state.status = { ...state.status, ...status };
    },
    numAccounts2Profiles(state, payload) {
      state.numAccounts2Profiles = payload;
    },
    profilesLoaded(state, payload) {
      state.profilesLoaded = true;
      state.profiles = payload;
      for (let id in payload) {
        if (payload.hasOwnProperty(id)) {
          let profile = {
            name: payload[id].name || payload[id].fbUser,
            active: !payload[id].checkPoint,
            captcha: 1,
            phone: 1,
            sms: 1,
            photo: 1,
            moderation: 1,
            banned: payload[id].checkPoint && payload[id].checkPoint === 'banned',
            payOrder: !!payload[id].payOrder,
            profileId: payload[id].profileId,
            created: payload[id].created,
            days: payload[id].days,
            shared: payload[id].shared 
          };
          if (payload[id].fbPublications) {
            profile.posts = payload[id].fbPublications;
          }
          if (payload[id].checkPoint) {
            if (payload[id].checkPoint === 'reCaptcha' || payload[id].checkPoint === 'imageCaptcha') {
              profile.captcha = 2;
            } else {
              profile[payload[id].checkPoint] = 2;
            }
          }
          if (payload[id].passedCheckPoints) {
            payload[id].passedCheckPoints.forEach((item) => {
              if (item === 'reCaptcha' || item === 'imageCaptcha') {
                profile.captcha = 3;
              } else {
                profile[item] = 3;
              }
            });
          }
          state.profilesArr.push({ id, ...profile });
        }
      }
    }
  },
  actions: {
    async createProfile({ commit, rootState }, numProfiles) {
      commit('clearError');
      commit('setLoading', true);
      try {
        await axios.get(`${window.location.protocol}//${window.location.host}/api/profiles/create/${numProfiles}/${rootState.shared.authToken}`)
          .then((response) => {
            if (response.data && response.data.profiles && response.data.createdNumProfiles !== undefined) {
              commit('createProfile', {
                profiles: response.data.profiles,
                createdNumProfiles: response.data.createdNumProfiles
              });
            }
          })
          .catch((error) => {
            console.log(error);
          });
        commit('setLoading', false);
      } catch (error) {
        commit('setLoading', false);
        commit('setError', error.message);
        throw error;
      }
    },
    accountHandler({ commit, rootState }, data) {
      commit('clearError');
      commit('setLoading', true);
      data.authToken = rootState.shared.authToken;
      axios.post(`${window.location.protocol}//${window.location.host}/api/accounts/start-handling`, data)
        .then((response) => {
          if (response.data && response.data.status === 'ok') {
            delete response.data.status;
            commit('setStatus', response.data);
          }
        })
        .catch((error) => {
          console.log(error);
          commit('setLoading', false);
        });

      const intervalId = setInterval(() => {
        axios.get(`${window.location.protocol}//${window.location.host}/api/accounts/status/${rootState.shared.authToken}`)
          .then((response) => {
            if (response.data) {
              commit('setStatus', response.data);
            }
          })
          .catch((e) => {
            commit('setLoading', false);
            commit('setError', e.message);
          });
      }, 10000);
      commit('setStatus', { intervalId });
    },
    account2Profile({ commit, rootState }, data) {
      commit('clearError');
      commit('setLoading', true);
      data.authToken = rootState.shared.authToken;
      axios.post(`${window.location.protocol}//${window.location.host}/api/accounts/to/profiles/`, data)
        .then((response) => {
          if (response.data && response.data.numAccounts2Profiles !== undefined) {
            commit('numAccounts2Profiles', response.data.numAccounts2Profiles);
          }
          commit('setLoading', false);
        })
        .catch((error) => {
          console.log(error);
          commit('setLoading', false);
          commit('setError', error.message);
        });
    },
    getProfiles({ commit, rootState }) {
      commit('clearError');
      commit('setLoading', true);
      return axios.get(`${window.location.protocol}//${window.location.host}/api/profiles/${rootState.shared.authToken}`)
        .then((response) => {
          if (response.data && response.data.profiles) {
            commit('profilesLoaded', response.data.profiles);
          }
          commit('setLoading', false);
        })
        .catch((error) => {
          commit('setLoading', false);
          commit('setError', error.message);
        });
    },
    shareProfiles({ commit, dispatch, rootState }, { ids, user }) {
      commit('clearError');
      commit('setLoading', true);
      dispatch('send', { action: 'shareProfiles', ids, user });
      // const data = {
      //   ids,
      //   authToken: rootState.shared.authToken
      // };
      // return axios.post(`${window.location.protocol}//${window.location.host}/api/profiles/share`, data)
      //   .then((response) => {
      //     if (response.data && response.data.profiles) {
      //       commit('profilesLoaded', response.data.profiles);
      //     }
      //     commit('setLoading', false);
      //   })
      //   .catch((error) => {
      //     commit('setLoading', false);
      //     commit('setError', error.message);
      //   });
    }
  }
  // getters: {
  //   profiles(state) {
  //     return state.profiles;
  //   },
  //   profilesArr(state){
  //     return state.profilesArr;
  //   },
  //   createdNumProfiles(state){
  //     return state.createdNumProfiles;
  //   },
  //   numAccounts2Profiles(state){
  //     return state.numAccounts2Profiles;
  //   },
  //   profilesLoaded(state){
  //     return state.profilesLoaded;
  //   }
  // }
};
