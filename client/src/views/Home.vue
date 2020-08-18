<template>
  <v-row v-if="!profilesLoaded">
    <v-col align="center" justify="center">
      <v-progress-circular
        :size="70"
        :width="7"
        color="primary"
        indeterminate
      ></v-progress-circular>
    </v-col>
  </v-row>
  <v-layout row v-else>
    <v-flex xs12 sm12 md12 lg8 offset-lg2>
      <Toolbar />
      <v-card>
        <v-card-title primary-title>
          <v-container>
            <v-layout row>
              <v-flex mb-3>
                <h2 class="headline">Запуск работы с аккаунтами фейсбука</h2>
              </v-flex>
            </v-layout>
            <v-layout row wrap>
              <v-flex xs12 sm6 md6 px-1>
                <v-text-field
                  label="Время на 1 аккаунт, дней"
                  outlined
                  v-model="days"
                ></v-text-field>
              </v-flex>
              <v-flex xs12 sm6 md6 px-1>
                <v-text-field
                  label="Постов в день, шт"
                  outlined
                  v-model="postsPerDay"
                ></v-text-field>
              </v-flex>
              <v-flex xs12 sm6 md6 px-1>
                <v-text-field
                  label="Длительность одной сессии, минут"
                  outlined
                  v-model="duration"
                ></v-text-field>
              </v-flex>
              <v-flex xs12 sm6 md6 px-1>
                <v-text-field
                  label="Период рекламы, дней"
                  outlined
                  v-model="interval"
                ></v-text-field>
              </v-flex>
            </v-layout>
            <v-layout row mb-3>
              <v-flex>
                <v-btn
                  large
                  color="info"
                  @click="accountHandler"
                  :loading="!!accountsInProgress"
                  :disabled="!!accountsInProgress"
                >Запустить</v-btn>
              </v-flex>
            </v-layout>
            <v-layout row v-if="accountsInProgress">
              <v-flex my-3>
                <p>Аккаунтов обрабатывается: {{ accountsInProgress }}</p>
              </v-flex>
            </v-layout>
            <v-layout row v-if="progressValue" mb-3>
              <v-flex my-3>
                <p>Аккаунтов обработано: {{ handledAccounts }}</p>
                <v-progress-linear
                  color="teal"
                  buffer-value="0"
                  :value="progressValue"
                  stream
                ></v-progress-linear>
              </v-flex>
            </v-layout>
            <v-divider></v-divider>
            <v-layout row>
              <v-flex xs12 sm12 md12 my-3>
                <h2 class="headline">Работа с аккаунтами</h2>
              </v-flex>
            </v-layout>
            <v-radio-group v-model="profileFilter" row>
              <v-radio
                label="Все"
                value="all"
                color="primary"
              ></v-radio>
              <v-radio
                label="Рабочие"
                value="active"
                color="primary"
                default
              ></v-radio>
              <v-radio
                label="Забаненные"
                value="banned"
                color="primary"
              ></v-radio>
            </v-radio-group>
            <v-data-table
              :headers="headers"
              :items="profilesArr"
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
                  <td>{{ id + 1 }}</td>
                  <td>{{ item.id }}</td>
                  <td>{{ item.name }}</td>

                  <td class="text-xs-center" v-if="item.active">
                    <v-icon style="color:green;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else>
                    <v-icon style="color:red;">clear</v-icon>
                  </td>

                  <td class="text-xs-center">
                    {{ item.numPosts }}
                  </td>

                  <td class="text-xs-center" v-if="item.captcha === 1">
                    <v-icon style="color:gray;">clear</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.captcha === 2">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.captcha === 3">
                    <v-icon style="color:green;">done</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.phone === 1">
                    <v-icon style="color:gray;">clear</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.phone === 2">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.phone === 3">
                    <v-icon style="color:green;">done</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.sms === 1">
                    <v-icon style="color:gray;">clear</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.sms === 2">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.sms === 3">
                    <v-icon style="color:green;">done</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.photo === 1">
                    <v-icon style="color:gray;">clear</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.photo === 2">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.photo === 3">
                    <v-icon style="color:green;">done</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.moderation === 1">
                    <v-icon style="color:gray;">clear</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.moderation === 2">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else-if="item.moderation === 3">
                    <v-icon style="color:green;">done</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.banned">
                    <v-icon style="color:red;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else>
                    <v-icon style="color:green;">clear</v-icon>
                  </td>

                  <td class="text-xs-center" v-if="item.payOrder">
                    <v-icon style="color:green;">done</v-icon>
                  </td>
                  <td class="text-xs-center" v-else>
                    <v-icon style="color:red;">clear</v-icon>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-container>
        </v-card-title>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Toolbar from '../components/Toolbar';

export default {
  name: 'home',
  components: {
    Toolbar
  },
  data () {
    return {
      days: null,
      postsPerDay: null,
      duration: null,
      interval: null,
      numProfiles: null,
      pagination: {
        rowsPerPage: 20,
        // sortBy: 'sms',
        rowsPerPageItems: [10, 20, 50, 100, 500],
        rowsPerPageText: 'Показать строк'
      },
      profileFilter: 'all',
      headers: [
        {
          text: '#',
          sortable: false
        },
        {
          text: 'Id',
          sortable: false
        },
        {
          text: 'Аккаунт',
          align: 'left',
          sortable: false
        },
        {
          text: 'Активный',
          sortable: false
        },
        {
          text: 'Посты',
          sortable: false
        },
        {
          text: 'Капча',
          sortable: false
        },
        {
          text: 'Тел',
          sortable: false
        },
        {
          text: 'СМС',
          sortable: false
        },
        {
          text: 'Фото',
          sortable: false
        },
        {
          text: 'Модерация',
          sortable: false
        },
        {
          text: 'Бан',
          sortable: false
        },
        {
          text: 'Платежка',
          sortable: false
        }
      ]
    }
  },
  methods: {
    createProfile(){
      this.$store.dispatch('createProfile', this.numProfiles);
    },
    accountHandler(){
      this.$store.dispatch('accountHandler', {
        days: this.days,
        postsPerDay: this.postsPerDay,
        duration: this.duration,
        interval: this.interval
      });
    },
    account2Profile(){
      this.$store.dispatch('account2Profile', {
        days: this.days,
        postsPerDay: this.postsPerDay,
        duration: this.duration,
        interval: this.interval
      });
    }
  },
  computed: {
    accountsInProgress(){
      return this.$store.state.profiles.status.accountsInProgress;
    },
    handledAccounts(){
      return this.$store.state.profiles.status.handledAccounts;
    },
    accounts(){
      return this.$store.state.profiles.status.accounts;
    },
    profilesLoaded(){
      return this.$store.state.profiles.profilesLoaded;
    },
    progressValue(){
      if(this.accounts){
        return this.handledAccounts / this.accounts * 100;
      } else {
        return 0;
      }
    },
    loading() {
      return this.$store.state.shared.loading;
    },
    totalNumProfiles(){
      return Object.keys(this.$store.state.profiles.profiles).length;
    },
    createdNumProfiles(){
      return this.$store.state.createdNumProfiles;
    },
    numAccounts2Profiles(){
      return this.$store.state.profiles.numAccounts2Profiles;
    },
    profilesArr(){

      const profiles = this.$store.state.profiles.profilesArr.map(profile => {
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

      if(this.profileFilter){
        if(this.profileFilter === 'banned') {
          return profiles.filter((profile) => {
            return profile.banned;
          });
        } else if(this.profileFilter === 'active'){
          return profiles.filter((profile) => {
            return profile.active;
          });
        }
      }
      return profiles;
    }
  }
}
</script>

<style lang="stylus">
  .v-data-table
    tr
      th
        font-size 10px
</style>