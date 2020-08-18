import Vue from 'vue';
import Router from 'vue-router';
import Home from '../views/Home';
import Share from '../views/Share';
import Upload from '../views/Upload';
import Errors from '../views/Errors';
import Login from '../views/Login';
import Posts from '../views/Posts';

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/share',
      name: 'share',
      component: Share
    },
    {
      path: '/posts',
      name: 'posts',
      component: Posts
    },
    {
      path: '/upload',
      name: 'upload',
      component: Upload
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/errors',
      name: 'errors',
      component: Errors
    }
  ],
  mode: 'history'
});

export default router;
