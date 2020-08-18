import Vue from 'vue';
import Vuex from 'vuex';
import profiles from './profiles';
import shared from './shared';
import uploads from './uploads';
import errors from './errors';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    errors,
    profiles,
    shared,
    uploads
  }
})
