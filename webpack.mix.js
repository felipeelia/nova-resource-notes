let mix = require('laravel-mix')

mix.setPublicPath('dist')
    .js('resources/js/field.js', 'js')
    .vue({ version: 3 })
    .webpackConfig({
        // Nova provides Vue globally.
        externals: { vue: 'Vue' },
        output: { uniqueName: 'nova-eloquent-notes-field' },
    })
