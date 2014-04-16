/**
 * Created by ELatA on 2014/4/10.
 */
module.exports = function(grunt){
    grunt.initConfig({
        bower: {
            all: {
                rjsConfig: 'public/config.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-bower-requirejs');

    grunt.registerTask('default', ['bower']);
}