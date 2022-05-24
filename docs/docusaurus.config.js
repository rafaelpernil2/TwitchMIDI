// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'TwitchMIDI',
    tagline: 'Allow your viewers to be part of your musical creations!',
    url: 'https://twitchmidi.com',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.ico',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'rafaelpernil2', // Usually your GitHub org/user name.
    projectName: 'TwitchMIDI', // Usually your repo name.

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en', 'es']
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve('./sidebars.js')
                },
                blog: {
                    showReadingTime: true
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css')
                }
            })
        ]
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                title: 'TwitchMIDI',
                logo: {
                    alt: 'TwitchMIDI Logo',
                    src: 'img/logo.svg'
                },
                items: [
                    {
                        type: 'localeDropdown',
                        position: 'left'
                    },
                    {
                        type: 'doc',
                        docId: 'intro',
                        position: 'left',
                        label: 'Get Started'
                    },
                    {
                        href: 'https://github.com/rafaelpernil2/TwitchMIDI',
                        label: 'GitHub',
                        position: 'right'
                    }
                ]
            },
            footer: {
                style: 'dark',
                links: [
                    {
                        title: 'Docs',
                        items: [
                            {
                                label: 'ReadMe',
                                to: 'https://github.com/rafaelpernil2/TwitchMIDI/blob/master/README.md'
                            }
                        ]
                    },
                    {
                        title: 'Community',
                        items: [
                            {
                                label: 'Twitter',
                                href: 'https://twitter.com/rafaelpernil'
                            }
                        ]
                    },
                    {
                        title: 'More',
                        items: [
                            {
                                label: 'Blog',
                                to: 'https://blog.rafaelpernil.com'
                            },
                            {
                                label: 'GitHub',
                                href: 'https://github.com/rafaelpernil2'
                            }
                        ]
                    }
                ],
                copyright: `Copyright © ${new Date().getFullYear()} TwitchMIDI - Rafael Pernil. Built with Docusaurus.`
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme
            },
            colorMode: { respectPrefersColorScheme: true },
            metadata: [{ name: 'keywords', content: 'Twitch, MIDI, music, software, bot, tool, documentation' }]
        })
};

module.exports = config;
