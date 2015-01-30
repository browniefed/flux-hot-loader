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
      prependText,
      appendText,
      node,
      result;

  prependText = [
    '/* FLUX HOT LOADER */',
    '(function () {',
      'if (module.hot) {',
        'var dispatcher = require(' + JSON.stringify(options.dispatcher) + ');',

        'if (!dispatcher.__fluxHotLoaderUnpatchedRegister) {',
        '  dispatcher.__fluxHotLoaderUnpatchedRegister = dispatcher.register;',
        '}',

        'module.hot.__fluxHotLoaderPreviousRegister = dispatcher.register;',
        'module.hot.__fluxHotLoaderRegisteredCallbacks = {};',

        'dispatcher.register = function register(callback) {',
        '  var dispatchToken = dispatcher.__fluxHotLoaderUnpatchedRegister.apply(dispatcher, arguments);',
        '  module.hot.__fluxHotLoaderRegisteredCallbacks[dispatchToken] = callback;',
        '  return dispatchToken;',
        '};',
      '}',
    '})();',

    'try {'
  ].join('\n');

  appendText = [
    '/* FLUX HOT LOADER */',
    '} finally {',
      'if (module.hot) {',
        '(function () {',
          'var dispatcher = require(' + JSON.stringify(options.dispatcher) + ');',
          'dispatcher.register = module.hot.__fluxHotLoaderPreviousRegister;',
        '})();',
      '}',
    '}',

    'if (module.hot) {',
      '(function () {',
        'if (!module.exports) {',
        '  return;',
        '}',

        'if (typeof module.exports.emitChange !== "function") {',
          'console.warn(' + JSON.stringify(filename) + ' + " does not appear to be an event emitter.");',
          'return;',
        '}',

        'var dispatcher = require(' + JSON.stringify(options.dispatcher) + '),',
            'newCallbacks = module.hot.__fluxHotLoaderRegisteredCallbacks,',
            'allCallbacks = dispatcher["$Dispatcher_callbacks"],',
            'unpatchedRegister = dispatcher.__fluxHotLoaderUnpatchedRegister,',
            'actions = [],',
            'spyListenerId;',

        'module.hot.dispose(function (data) {',
          'dispatcher.unregister(spyListenerId);',

          'for (var dispatchToken in newCallbacks) {',
            'if (newCallbacks.hasOwnProperty(dispatchToken)) {',
              'dispatcher.unregister(dispatchToken);',
            '}',
          '}',

          'data.events = module.exports._events;',
          'data.actions = actions;',
        '});',

        'spyListenerId = unpatchedRegister.call(dispatcher, function (payload) {',
          'actions.push(payload);',
        '});',

        'if (module.hot.data) {',
          'module.exports._events = module.hot.data.events;',
        '}',

        'if (module.hot.data) {',
          'actions = module.hot.data.actions;',

          'var emitChange = module.exports.emitChange,',
              'waitFor = dispatcher.waitFor;',

          'module.exports.emitChange = function () {}',
          'dispatcher.waitFor = function () {}',

          'try {',
            'actions.forEach(function (action) {',
              'for (var dispatchToken in newCallbacks) {',
                'if (newCallbacks.hasOwnProperty(dispatchToken)) {',
                  'newCallbacks[dispatchToken](action);',
                '}',
              '}',
            '});',
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
      prependText,
      source,
      appendText
    ].join(separator));
  }

  if (!map) {
    map = makeIdentitySourceMap(source, this.resourcePath);
  }

  node = new SourceNode(null, null, null, [
    new SourceNode(null, null, this.resourcePath, appendText),
    SourceNode.fromStringWithSourceMap(source, new SourceMapConsumer(map)),
    new SourceNode(null, null, this.resourcePath, appendText)
  ]).join(separator);

  result = node.toStringWithSourceMap();

  this.callback(null, result.code, result.map.toString());
};
