import Vue from 'vue';
import '@babel/polyfill';

import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false;
Vue.use({ auth1: 'alert auth'});

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App),
  beforeCreate() {
    if (!this.$store.state.shared.authToken) {
      this.$store.dispatch('setAuth');
    } else {
      this.$store.dispatch('getProfiles');
    }
  }
}).$mount('#app');
