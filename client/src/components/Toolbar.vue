<template>
  <v-toolbar>
    <v-spacer></v-spacer>
    <template v-if="$vuetify.breakpoint.smAndUp">
      <router-link to="/">
        <v-btn icon>
          <v-icon>home</v-icon>
        </v-btn>
      </router-link>
      <!-- <router-link to="/share">
        <v-btn icon>
          <v-icon title="Перенос профилей">share</v-icon>
        </v-btn>
      </router-link> -->
      <router-link to="/upload">
        <v-btn icon>
          <v-icon title="Загрузка данных">cloud_upload</v-icon>
        </v-btn>
      </router-link>
      <router-link to="/errors">
        <v-btn icon>
          <v-icon title="Ошибки">bug_report</v-icon>
        </v-btn>
      </router-link>
      <v-btn
        icon
        v-if="authToken"
        @click="exit"
      >
        <v-icon title="Выход">exit_to_app</v-icon>
      </v-btn>
    </template>
  </v-toolbar>
</template>

<script>
  export default {
    name: 'Toolbar',
    methods: {
      exit(){
        this.$store.dispatch('exit');
        document.location.reload();
      }
    },
    computed: {
      authToken(){
        return this.$store.state.shared.authToken;
      }
    }
  };
</script>

<style scoped lang="stylus">
  .v-toolbar a
    text-decoration none
</style>
