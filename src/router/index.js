/* eslint-disable vue/multi-word-component-names */
import { createRouter, createWebHistory } from 'vue-router'

// 页面组件引入
import LoginPage from '@/pages/LoginPage.vue'
import Dashboard from '@/pages/DashBoard.vue'
import UserManage from '@/pages/UserManage.vue'
import ProjectManage from '@/pages/ProjectManage.vue'
import SystemConfig from '@/pages/SystemConfig.vue'

import ErrorLogs from '@/pages/ErrorLogs.vue'
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'LoginPage',
    component: LoginPage
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/usermanage',
    name: 'UserManage',
    component: UserManage
  },{
    path:'/projectmanage',
    name:'ProjectManage',
    component:ProjectManage
  },
  {
    path:'/systemconfig',
    name:'SystemConfig',
    component:SystemConfig
  },
  {
       path:'/errorlogs',
    name:'ErrorLogs',
    component:ErrorLogs
  },
  {
    path:"/usernumbermanage",
    name:"UserNumberManage",
    component: () => import('@/pages/NumberManage.vue')
  },
  {
    path:'/billManage',
    name:'BillManage',
    component: () => import('@/pages/BillManage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
