<template>
  <v-row v-if="!profilesLoaded">
    <v-col align="center" justify="center">
      <v-progress-circular :size="70" :width="7" color="primary" indeterminate></v-progress-circular>
    </v-col>
  </v-row>
  <v-layout row v-else>
    <v-flex xs12 sm12 md12 lg8 offset-lg2>
      <Toolbar />
      <v-card>
        <v-card-title primary-title>
          <v-container>
            <v-layout row>
              <v-flex xs12 sm12 md12 my-3>
                <h2 class="headline">Перенос профилей</h2>
              </v-flex>
            </v-layout>
            <v-layout row mb-3>
              <v-flex xs12 sm6 md3 px-1>
                <v-text-field
                  label="Аккаунт"
                  outlined
                  v-model="multiloginAcc"
                  :rules="[rules.required, rules.email]"
                ></v-text-field>
              </v-flex>
              <v-flex xs12 sm6 md3 px-1>
                <v-btn
                  large
                  color="info"
                  @click="share"
                  :loading="loading"
                  :disabled="shareDisabled"
                >передать</v-btn>
              </v-flex>
            </v-layout>
            <v-radio-group v-model="profileFilter" row>
              <v-radio label="с истекшим сроком обработки" value="expired" color="primary" default></v-radio>
              <v-radio label="все активные" value="all" color="primary"></v-radio>
            </v-radio-group>
            <v-data-table
              v-model="selected"
              :headers="headers"
              :items="profilesArr"
              :items-per-page="20"
              show-select
              class="elevation-1"
              :footer-props="{
                'items-per-page-options': [10, 20, 50, 100, 500],
                'items-per-page-all-text': 'Все',
                'items-per-page-text': 'Показать строк'
              }"
            ></v-data-table>
          </v-container>
        </v-card-title>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Toolbar from "../components/Toolbar";

const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default {
  name: "share",
  components: {
    Toolbar
  },
  data() {
    return {
      rules: {
        required: value =>
          !!value.trim() || "Укажите логин аккаунта в Multilogin!",
        email: value => pattern.test(value) || "Некорректный e-mail!"
      },
      multiloginAcc: "",
      selected: [],
      pagination: {
        rowsPerPage: 20,
        // sortBy: 'sms',
        rowsPerPageItems: [10, 20, 50, 100, 500],
        rowsPerPageText: "Показать строк"
      },
      profileFilter: "expired",
      headers: [
        {
          text: "Id",
          sortable: false,
          value: "id"
        },
        {
          text: "Profile id",
          sortable: false,
          value: "profileId"
        },
        {
          text: "Аккаунт",
          align: "left",
          sortable: false,
          value: "name"
        }
      ]
    };
  },
  methods: {
    share() {
      if (this.selectedIds.length && this.multiloginAcc) {
        this.$store.dispatch("shareProfiles", {
          ids: this.selectedIds,
          user: this.multiloginAcc
        });
      }
      console.log(this.selectedIds);
    }
  },
  computed: {
    shareDisabled() {
      return (
        !this.selectedIds.length ||
        !this.multiloginAcc ||
        !pattern.test(this.multiloginAcc) ||
        this.$store.state.shared.loading
      );
    },
    profilesLoaded() {
      return this.$store.state.profiles.profilesLoaded;
    },
    loading() {
      return this.$store.state.shared.loading;
    },
    profiles() {
      const profiles = Object.values(this.$store.state.profiles.profiles);
      console.log(profiles);
    },
    selectedIds() {
      let tmp = [];
      this.selected.forEach(profile => {
        if (!this.$store.state.profiles.profiles[profile.id].shared) {
          tmp = [...tmp, profile];
        }
      });
      this.selected = [...tmp];

      return this.selected.map(profile => {
        return profile.id;
      });
    },
    profilesArr() {
      return this.$store.state.profiles.profilesArr.filter(profile => {
        if (this.profileFilter === "all") {
          return (
            profile.active && profile.profileId && profile.profileId.trim()
          );
        } else if (this.profileFilter === "expired") {
          return (
            profile.active &&
            !profile.shared &&
            profile.profileId &&
            profile.profileId.trim() &&
            profile.created + profile.days * 24 * 60 * 60 * 1000 < new Date()
          );
        }
      });
    }
  }
};
</script>

<style lang="stylus">
.v-data-table {
  tr {
    th {
      font-size: 10px;
    }
  }
}
</style>
