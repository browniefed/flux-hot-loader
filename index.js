'use strict';

var path = require('path'),
    utils = require('loader-utils'),
    SourceNode = require('source-map').SourceNode,
    SourceMapConsumer = require('source-map').SourceMapConsumer,
    makeIdentitySourceMap = require('./makeIdentitySourceMap');

module.exports = function (source, map) {
  if (this.cacheable) {
    this.cacheable();
  }

  var options = utils.parseQuery(this.query),
      filename = path.basename(this.resourcePath),
      separator = '\n\n',
      appendText,
      node,
      result;

  appendText = [
    '/* FLUX HOT LOADER */',
    'if (module.hot) {',
      '(function () {',
        'if (!module.exports) {',
        '  return;',
        '}',

        'var canRewind = !!module.exports.dispatchToken;',
        'if (!canRewind) {',
          'console.warn(' + JSON.stringify(filename) + ' + " is missing a dispatchToken on module.exports.");',
        '}',

        'if (typeof module.exports.emitChange !== "function") {',
          'console.warn(' + JSON.stringify(filename) + ' + " does not appear to be an event emitter.");',
          'return;',
        '}',

        'var dispatcher = require(' + JSON.stringify(options.dispatcher) + '),',
            'actions = [],',
            'spyListenerId;',

        'module.hot.dispose(function (data) {',
          'if (canRewind) {',
            'dispatcher.unregister(spyListenerId);',
            'dispatcher.unregister(module.exports.dispatchToken);',
          '}',

          'data.dispatchToken = module.exports.dispatchToken;',
          'data.events = module.exports._events;',
          'data.actions = actions;',
        '});',

        'if (canRewind) {',
          'spyListenerId = dispatcher.register(function (payload) {',
            'actions.push(payload);',
          '});',
        '}',

        'if (module.hot.data) {',
          'module.exports._events = module.hot.data.events;',
        '}',

        'if (module.hot.data && canRewind) {',
          'actions = module.hot.data.actions;',

          'var callbacks = dispatcher["$Dispatcher_callbacks"],',
              'cb = callbacks[module.exports.dispatchToken];',

          'callbacks[module.hot.data.dispatchToken] = cb;',
          'delete callbacks[module.exports.dispatchToken];',
          'module.exports.dispatchToken = module.hot.data.dispatchToken;',

          'var emitChange = module.exports.emitChange,',
              'waitFor = dispatcher.waitFor;',

          'module.exports.emitChange = function () {}',
          'dispatcher.waitFor = function () {}',

          'try {',
            'actions.forEach(cb);',
          '} finally {',
            'module.exports.emitChange = emitChange;',
            'dispatcher.waitFor = waitFor;',
            'setTimeout(emitChange);',
          '}',
        '}',
      '})();',
    '}'
  ].join('\n');

  if (this.sourceMap === false) {
    return this.callback(null, [
      source,
      appendText
    ].join(separator));
  }

  if (!map) {
    map = makeIdentitySourceMap(source, this.resourcePath);
  }

  node = new SourceNode(null, null, null, [
    SourceNode.fromStringWithSourceMap(source, new SourceMapConsumer(map)),
    new SourceNode(null, null, this.resourcePath, appendText)
  ]).join(separator);

  result = node.toStringWithSourceMap();

  this.callback(null, result.code, result.map.toString());
};
