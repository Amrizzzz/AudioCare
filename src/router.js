import { createRouter, createWebHistory } from 'vue-router'


import Wellcome from "./pages/wellcomePage/wellcome.vue"

const routes = [
  { path: '/', component: Wellcome, meta: { layout: false } },

  // Authentication
  // { path: '/sign-in', component: SignIn, meta: { layout: false } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router