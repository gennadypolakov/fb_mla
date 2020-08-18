<template>
  <v-row v-if="loading">
    <v-col align="center" justify="center">
      <v-progress-circular :size="70" :width="7" color="primary" indeterminate></v-progress-circular>
    </v-col>
  </v-row>
  <v-layout row v-else>
    <v-flex xs12 sm6 offset-sm3>
      <Toolbar />
      <v-card>
        <v-card-title primary-title>
          <v-container>
            <v-layout row>
              <v-flex xs12 sm12 md12 mb-3>
                <h2 class="headline">Посты</h2>
              </v-flex>
            </v-layout>
            <v-divider></v-divider>
            <v-data-table
              v-if="posts.length"
              :headers="headers"
              :items="posts"
              :items-per-page="20"
              class="elevation-1"
              :footer-props="{
                'items-per-page-options': [10, 20, 50, 100, 500],
                'items-per-page-all-text': 'Все',
                'items-per-page-text': 'Показать строк'
              }"
            >
              <template v-slot:body="props">
                <tr v-for="(item, id) in props.items" :key="id">
                  <td>{{ item.name }}</td>
                  <td class="text-xs-center">{{ item.numPosts }}</td>
                </tr>
              </template>
            </v-data-table>
            <v-layout row v-else>
              <v-flex xs12 sm12 md12 mb-3>
                <p>Лог постов пуст</p>
              </v-flex>
            </v-layout>
          </v-container>
        </v-card-title>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Toolbar from "../components/Toolbar";

export default {
  name: "home",
  components: {
    Toolbar
  },
  data() {
    return {
      pagination: {
        rowsPerPage: 20,
        // sortBy: 'sms',
        rowsPerPageItems: [10, 20, 50, 100, 500],
        rowsPerPageText: "Показать строк"
      },
      profileStatus: "all",
      headers: [
        {
          text: "Аккаунт",
          align: "left",
          sortable: true,
          value: "name"
        },
        {
          text: "Количество постов",
          sortable: true,
          value: "numPosts"
        }
      ]
    };
  },
  computed: {
    posts() {
      return this.$store.state.profiles.profilesArr.map(profile => {
        let numPosts = 0;
        if (profile.posts) {
          if (profile.posts instanceof Array) {
            numPosts = profile.posts.length;
          } else if (profile.posts instanceof Object) {
            for (let date in profile.posts) {
              if (profile.posts.hasOwnProperty(date)) {
                numPosts += profile.posts[date].length;
              }
            }
          }
        }
        profile.numPosts = numPosts;
        return profile;
      });
    },
    loading() {
      return this.$store.state.shared.loading;
    }
  }
};
</script>
