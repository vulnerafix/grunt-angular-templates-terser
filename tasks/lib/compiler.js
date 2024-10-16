/*
 * grunt-angular-templates
 * https://github.com/ericclemmons/grunt-angular-templates
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var Url     = require('url');

/**
 * Angular Template Compiler
 * @param  {Object} grunt   Grunt global variable
 * @param  {Object} options Task options
 * @param  {String} cwd     Determines if paths are relative or not
 * @return {Object}
 */
var Compiler = function(grunt, options, cwd, expanded) {

  /**
   * Wrap individual cache registration script in bootstrap function
   *
   * @param  {String} script  Multiline string of `$templateCache.put(...)`
   * @return {String}         Final template aggregate script
   */
  this.bootstrap = function(module, script) {
    return options.bootstrap(module, script, options);
  };

  /**
   * Wrap HTML template in `$templateCache.put(...)`
   * @param  {String} template  Multiline HTML template string
   * @param  {String} url       URL to act as template ID
   * @return {String}           Template wrapped in `$templateCache.put(...)`
   */
  this.cache = function(template, url, prefix) {
    var path = prefix;

    // Force trailing slash
    if (path.length) {
      path = path.replace(/\/?$/, '/');
    }

    if(cwd && expanded){
      var cwdRegExp = new RegExp('^' + cwd + '\/?');
      url = url.replace(cwdRegExp, '');
    }

    // Append formatted URL
    path += Url.format( Url.parse( url.replace(/\\/g, '/') ) );

    return "\n  $templateCache.put('" + path + "',\n    " + template + "\n  );\n";
  };

  /**
   * Convert list of files into Javascript that caches their contents
   * @param  {String} module  Module name
   * @param  {Array} files    List of files relative to `cwd`
   * @return {String}         Final template aggregate script
   */
  this.compile = function(module, files) {
    var paths = files.map(this.path).filter(function(path) {
      if (!grunt.file.exists(path)) {
        grunt.log.warn('Template "' + path + '" not found.');
        return false;
      }

      return true;
    });

    var script = "  'use strict';" + grunt.util.linefeed;

    script += paths
      .map(this.load)
      .map(function(source, i) {
        return this.customize(source, paths[i]);
      }.bind(this))
      .map(this.stringify)
      .map(function(string, i) {
        return this.cache(string, this.url(files[i]), options.prefix);
      }.bind(this))
      .map(grunt.util.normalizelf)
      .join(grunt.util.linefeed)
    ;

    return this.bootstrap(module, script);
  };

  /**
   * Customize template source
   * @param  {String} source Possibly minified template source
   * @param  {String} path   Path to template file
   * @return {String}
   */
  this.customize = function(source, path) {
    if (typeof options.source === 'function') {
      return options.source(source, path, options);
    }

    return source;
  };

  /**
   * Load template path
   * @param  {String} path  Template path
   * @return {String}       Template source
   */
  this.load = function(path) {
    return grunt.file.read(path);
  };

  /**
   * Get static or dynamic module name from file.
   * @param  {String} file  File name
   * @return {String}
   */
  this.module = function(file) {
    if (typeof options.module === 'function') {
      return options.module(file, options);
    }

    return options.module;
  };

  /**
   * Group files into individual modules
   * @param  {Array} files  Files
   * @return {Object}       Key/Value pair of module + files
   */
  this.modules = function(files) {
    var modules = {};

    files.forEach(function(file) {
      var module = this.module(file);

      if (!modules[module]) {
        modules[module] = [];
      }

      modules[module].push(file);
    }, this);

    return modules;
  };

  /**
   * Get path to template file on filesystem
   * @param  {String} file  Name of file relative to `cwd`
   * @return {String}       Template path
   */
  this.path = function(file) {
    if (cwd && !expanded) {
      return cwd + '/' + file;
    }

    return file;
  };

  /**
   * Convert template source Javascript-friendly lines
   * @param  {String} source Template source
   * @return {String}
   */
  this.stringify = function(source) {
    return source.split(/^/gm).map(function(line) {
      var quote = options.quotes === 'single' ? '\'' : '"';

      line = line.replace(/\\/g, '\\\\');
      line = line.replace(/\n/g, '\\n');
      line = line.replace(/\r/g, '\\r');
      var quoteRegExp = new RegExp(quote, 'g');
      line = line.replace(quoteRegExp, '\\' + quote);

      return quote + line + quote;
    }).join(' +\n    ') || '""';
  };

  /**
   * Convert file name to URL
   * @param  {String} file  File name
   * @return {String}       URL
   */
  this.url = function(file) {
    if (typeof options.url === 'function') {
      return options.url(file, options);
    }

    return file;
  };

};

module.exports = Compiler;
