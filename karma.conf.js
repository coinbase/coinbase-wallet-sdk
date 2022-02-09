module.exports = function (config) {
  config.set({
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-browserify'
    ],

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    frameworks: ['jasmine', 'browserify'],

    // list of files / patterns to load in the browser
    files: ['__tests__/**/*.js'],

    preprocessors: {
      '__tests__/**/*.js': ['browserify'],
    },

    browserify: {
      debug: true
    }
  });
};