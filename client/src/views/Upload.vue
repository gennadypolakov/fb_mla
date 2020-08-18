<template>
  <v-layout v-if="!profilesLoaded">
    <v-flex xs12 sm6 offset-sm3 class="text-center py-5">
      <v-progress-circular :size="70" :width="7" color="primary" indeterminate></v-progress-circular>
    </v-flex>
  </v-layout>
  <v-layout row v-else>
    <v-flex xs12 sm12 md12 lg8 offset-lg2>
      <v-card>
        <Toolbar />
        <v-container fluid grid-list-xl>
          <v-layout wrap>
            <v-flex xs12>
              <h1>Загрузка данных</h1>
              <v-radio-group v-model="dataType" row>
                <v-radio label="Прокси" value="proxy" color="primary"></v-radio>
                <v-radio label="Аккаунты" value="accounts" color="primary" default></v-radio>
              </v-radio-group>
              <div v-if="dataType === 'proxy'">
                <h2>Тип прокси</h2>
                <v-radio-group v-model="proxyType" row>
                  <v-radio label="SOCKS" value="SOCKS" color="primary" default></v-radio>
                  <v-radio label="HTTP" value="HTTP" color="primary"></v-radio>
                </v-radio-group>
              </div>
              <div class="data-format">
                <h2>Формат данных в файле</h2>
                <p>каждая запись с новой строки</p>
                <p v-if="dataType === 'accounts'">
                  login<span>;</span>password
                </p>
                <p v-else-if="dataType === 'proxy'">
                  login<span>:</span>password<span>@</span>host<span>:</span>port
                </p>
              </div>
              <v-file-input
                v-model="files"
                placeholder="выберите файл с исходными данными"
                prepend-icon="attach_file"
                multiple
              >
                <template v-slot:selection="{ text }">
                  <v-chip small label color="primary">{{ text }}</v-chip>
                </template>
              </v-file-input>
            </v-flex>
            <v-flex xs12 v-if="uploadingStatus.length > 0">
              <div>
                <h2>Результат обработки</h2>
                <ul>
                  <li v-for="(item, id) in uploadingStatus" :key="id">
                    файл {{ item.name }}
                    <br />
                    валидных строк {{ item.ok }}
                    <br />
                    строк с ошибками {{ item.error }}
                    <br />
                  </li>
                </ul>
              </div>
            </v-flex>
            <v-flex xs12 sm12 md12 mb-3>
              <v-btn
                color="info"
                :loading="loading"
                :disabled="loading || files.length === 0 || dataSent"
                @click="sendData"
              >Загрузить</v-btn>
            </v-flex>
          </v-layout>
        </v-container>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Toolbar from "../components/Toolbar";

export default {
  name: "Upload",
  components: {
    Toolbar
  },
  data() {
    return {
      files: [],
      dataType: 'proxy',
      proxyType: 'SOCKS'
    };
  },
  methods: {
    sendData() {
      const data = {
        files: this.files,
        route: this.dataType
      };
      if(this.dataType === 'proxy'){
        data.type = this.proxyType;
      }
      this.$store.dispatch("sendData", data);
    }
  },
  computed: {
    loading() {
      return this.$store.state.shared.loading;
    },
    profilesLoaded() {
      return this.$store.state.profiles.profilesLoaded;
    },
    dataSent() {
      return this.$store.state.uploads.dataSent;
    },
    uploadingStatus() {
      return this.$store.state.uploads.uploadingStatus;
    }
  },
  watch: {
    files() {
      this.$store.dispatch("dataSent", false);
      this.$store.dispatch("uploadingStatus", []);
    }
  }
};
</script>

<style scoped lang="stylus">
.data-format span {
  font-weight: bold;
  color: red;
  font-size: 1.1em;
}
</style>
