<template>
  <v-row align="center" justify="center">
    <v-col cols="12" sm="8" md="4">
      <v-form @submit.prevent="submit">
        <v-card class="elevation-12">
          <v-card-text>
              <v-text-field
                label="Пароль"
                v-model="password"
                prepend-icon="lock"
                type="password"
              ></v-text-field>
          </v-card-text>
          <v-btn
            icon
            type="submit"
          >
            <v-icon title="Вход">arrow_forward_ios</v-icon>
          </v-btn>
        </v-card>
      </v-form>
    </v-col>
  </v-row>
</template>

<script>
  export default {
    data(){
      return {
        password: null,
      };
    },
    methods: {
      submit(){
        this.$store.dispatch('login', this.password);
      }
    }
  }
</script>

<style scoped>
  .v-card {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
  }
</style>
