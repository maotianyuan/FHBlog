const path = require("path");

module.exports = {
    title: '风禾风禾呀',
    description: '风禾风禾呀',
    dest: 'dist',
    serviceWorker: true,
    base: '/FHBlog/',
    head: [
        ['link', { rel: 'icon', href: '/assets/img/zebra-3.png' }]
    ],
    themeConfig: {
        repo: "ReliaMM/FHBlog",
        docsDir: "docs",
        editLinks: true,
        editLinkText: "在 GitHub 上编辑此页",
        logo: '/assets/img/zebra-3.png',
        nav: [{
                text: '主页',
                link: '/',
            },
            {
                text: 'Vue',
                link: '/vue/Vuex 原理',
            },
            {
                text: 'JS',
                link: '/js/JavaScript 中的模拟实现',
            },
            {
                text: '浏览器',
                link: '/浏览器/跨域的九种解决方案',
            },
            {
                text: '安全',
                link: '/安全/最基础的 Web 安全问题',
            },
            {
                text: '服务器',
                link: '/服务器/基于 CentOS 7 搭建异常监控 Sentry',
            },
        ],

        sidebar: {
            '/vue/': [{
                title: 'Vue',
                collapsable: true,
                children: [
                    'Vuex 原理',
                    'vue-router 原理'
                ]
            }],
            '/js/': [{
                title: 'JS',
                collapsable: true,
                children: [
                    'JavaScript 中的模拟实现',
                ]
            }],
            '/浏览器/': [{
                title: '浏览器',
                collapsable: true,
                children: [
                    '浏览器缓存之强缓存与协商缓存',
                    '跨域的九种解决方案',
                ]
            }],
            '/安全/': [{
                title: '安全',
                collapsable: true,
                children: [
                    '最基础的 Web 安全问题',
                ]
            }],
            '/服务器/': [{
                title: '前端监控',
                collapsable: true,
                children: [
                    '基于 CentOS 7 搭建异常监控 Sentry',
                ]
            }]
        },
        configureWebpack: {
            resolve: {
                alias: {
                    '@': path.join(__dirname, 'public', 'assets')
                }
            }
        },
    },
    plugins: [
        ["@vuepress/back-to-top", true],
        [
            "@vuepress/pwa",
            {
              serviceWorker: true,
              updatePopup: {
                message: "文档内容有更新，点击刷新立即查看新内容。",
                buttonText: "刷新"
              }
            }
          ]
    ]
}