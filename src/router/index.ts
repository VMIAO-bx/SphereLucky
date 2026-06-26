import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Layout from '@/layout/index.vue'
import i18n from '@/locales/i18n'
import Home from '@/views/Home/index.vue'

export const configRoutes = {
    path: '/SphereLucky/config',
    name: 'Config',
    component: () => import('@/views/Config/index.vue'),
    children: [
        {
            path: '',
            redirect: '/SphereLucky/config/person',
        },
        {
            path: '/SphereLucky/config/person',
            name: 'PersonConfig',
            component: () => import('@/views/Config/Person/index.vue'),
            meta: {
                title: i18n.global.t('sidebar.personConfiguration'),
                icon: 'person',
            },
            children: [
                {
                    path: '',
                    redirect: '/SphereLucky/config/person/all',
                },
                {
                    path: '/SphereLucky/config/person/all',
                    name: 'AllPersonConfig',
                    component: () => import('@/views/Config/Person/PersonAll/index.vue'),
                    meta: {
                        title: i18n.global.t('sidebar.personList'),
                        icon: 'all',
                    },
                },
                {
                    path: '/SphereLucky/config/person/already',
                    name: 'AlreadyPerson',
                    component: () => import('@/views/Config/Person/PersonAlready/index.vue'),
                    meta: {
                        title: i18n.global.t('sidebar.winnerList'),
                        icon: 'already',
                    },
                },
                // {
                //     path:'other',
                //     name:'OtherPersonConfig',
                //     component:()=>import('@/views/Config/Person/OtherPersonConfig.vue'),
                //     meta:{
                //         title:'其他配置',
                //         icon:'other'
                //     }
                // }
            ],
        },
        {
            path: '/SphereLucky/config/prize',
            name: 'PrizeConfig',
            component: () => import('@/views/Config/Prize/PrizeConfig.vue'),
            meta: {
                title: i18n.global.t('sidebar.prizeConfiguration'),
                icon: 'prize',
            },
        },
        {
            path: '/SphereLucky/config/global',
            name: 'GlobalConfig',
            redirect: '/SphereLucky/config/global/all',
            meta: {
                title: i18n.global.t('sidebar.globalSetting'),
                icon: 'global',
            },
            children: [
                {
                    path: '/SphereLucky/config/global/face',
                    name: 'FaceConfig',
                    component: () => import('@/views/Config/Global/FaceConfig/index.vue'),
                    meta: {
                        title: i18n.global.t('sidebar.viewSetting'),
                        icon: 'face',
                    },
                },
                {
                    path: '/SphereLucky/config/global/image',
                    name: 'ImageConfig',
                    component: () => import('@/views/Config/Global/ImageConfig/index.vue'),
                    meta: {
                        title: i18n.global.t('sidebar.imagesManagement'),
                        icon: 'image',
                    },
                },
                {
                    path: '/SphereLucky/config/global/music',
                    name: 'MusicConfig',
                    component: () => import('@/views/Config/Global/MusicConfig/index.vue'),
                    meta: {
                        title: i18n.global.t('sidebar.musicManagement'),
                        icon: 'music',
                    },
                },
            ],
        },
        {
            path: '/SphereLucky/config/server',
            name: 'Server',
            component: () => import('@/views/Config/Server/index.vue'),
            meta: {
                hidden: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'true',
                title: i18n.global.t('sidebar.server'),
                icon: 'server',
            },
        },
        {
            path: '/SphereLucky/config/readme',
            name: 'Readme',
            component: () => import('@/views/Config/Readme/index.vue'),
            meta: {
                title: i18n.global.t('sidebar.operatingInstructions'),
                icon: 'readme',
            },
        },
    ],
}
const routes = [
    {
        path: '/',
        redirect: '/SphereLucky',
    },
    {
        path: '/SphereLucky',
        component: Layout,
        redirect: '/SphereLucky/home',
        children: [
            {
                path: '/SphereLucky/home',
                name: 'Home',
                component: Home,
            },
            {
                path: '/SphereLucky/demo',
                name: 'Demo',
                component: () => import('@/views/Demo/index.vue'),
            },
            {
                path: '/SphereLucky/mobile',
                name: 'Mobile',
                meta: {
                    isMobile: true,
                },
                component: () => import('@/views/Mobile/index.vue'),
            },
            configRoutes,
        ],
    },
]
const envMode = import.meta.env.MODE
const router = createRouter({
    // 读取环境变量
    history: (envMode === 'file' || import.meta.env.TAURI_PLATFORM) ? createWebHashHistory() : createWebHistory(),
    routes,
})

export default router
