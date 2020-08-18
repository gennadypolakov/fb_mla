<template>
  <v-row v-if="loading">
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
              <v-flex xs12 sm12 md12 mb-3>
                <h2 class="headline">Ошибки</h2>
              </v-flex>
            </v-layout>
            <v-divider></v-divider>
            <v-data-table
              v-if="errors.length"
              :headers="headers"
              :items="errors"
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
                  <td>
                    {{ item.selector }}
                  </td>
                  <td class="text-xs-center">
                    {{ item.notFound }}
                  </td>
                  <td class="text-xs-center">
                    {{ item.notClickable }}
                  </td>
                </tr>
              </template>
            </v-data-table>
            <v-layout row v-else>
              <v-flex xs12 sm12 md12 mb-3>
                <p>Лог ошибок пуст</p>
              </v-flex>
            </v-layout>
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
      pagination: {
        rowsPerPage: 20,
        // sortBy: 'sms',
        rowsPerPageItems: [10, 20, 50, 100, 500],
        rowsPerPageText: 'Показать строк'
      },
      profileStatus: 'all',
      headers: [
        {
          text: 'Селектор',
          align: 'left',
          sortable: false,
          value: 'selector'
        },
        {
          text: 'Не найден',
          sortable: false,
          value: 'notFound'
        },
        {
          text: 'Не кликабелен',
          sortable: false,
          value: 'notClickable'
        }
      ]
    }
  },
  created(){
    this.$store.dispatch('errors');
  },
  computed: {
    errors(){
      return this.$store.state.errors.errorsArray.map((item) => {
        let error = {
          selector: item,
          notFound: 0,
          notClickable: 0
        };
        let errors = this.$store.state.errors.errors;
          if(errors[item].notFound){
            error.notFound = errors[item].notFound;
          }
          if(errors[item].notClickable){
            error.notClickable = errors[item].notClickable;
          }
        return error
      });
    },
    loading() {
      return this.$store.state.shared.loading;
    }
  }
}
</script>
