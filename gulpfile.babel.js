// 1) Register Babel for everything the gulpfile loads (targets Node, not browsers)
import register from '@babel/register'
register({
  // don't use your browser-focused .babelrc here
  babelrc: false,
  extensions: ['.js'],
  ignore: [/node_modules/],
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
})

// 2) Now load your tasks (they can keep `import` syntax)
import requireDir from 'require-dir'
requireDir('./tasks', { recurse: true })
