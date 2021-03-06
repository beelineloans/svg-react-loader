/* eslint-disable */

var R = require('ramda');
var css = require('css');

var DEFAULTS = {
    prefix:      'filename-prefix__',
    tagKey:      'tagname',
    styleTagKey: 'style',
    childrenKey: 'children'
};

var CLASSNAME_OR_ID_REGEX = /([a-zA-Z0-9_-]+)/g;
var CLASSNAME_OR_ID_SELECTOR_REGEX = /([.#])([a-zA-Z0-9_-]+)/g;
var ID_REGEX = /([#a-zA-Z0-9_-]+)/g;
var ID_SELECTOR_REGEX = /(url\(#)([a-zA-Z0-9_-]+)/g; // just look for url ids, url(#someid)

function processStyles (opts, source) {
    var ast = css.parse(source);
    var rules = ast.stylesheet.rules;

    rules.
        forEach(function (rule) {
            var selectors = rule.selectors;
            var declarations = rule.declarations;

            rule.selectors =
                selectors.
                map(function (sel) {
                    return sel.
                        replace(
                            CLASSNAME_OR_ID_SELECTOR_REGEX,
                            function (match, pre, post) {
                                opts.cache[post] = opts.prefix + post;
                                return pre + opts.prefix + post;
                            }
                        );
                });

            rule.declarations =
                declarations.
                map(function (dec) {
                  dec.value = dec.value.
                  replace(
                      ID_SELECTOR_REGEX,
                      // eslint-disable-next-line prefer-arrow-callback
                      function (match, pre, post) {
                          opts.cache[post] = opts.prefix + post;
                          opts.cache['#' + post] = '#' + opts.prefix + post;
                          return pre + opts.prefix + post;
                      }
                  );
                  return dec;
                });
        });

    return css.stringify(ast, { compress: true });
}

module.exports = function configrePrefixStyleClassId (opts) {
    var options = R.merge(DEFAULTS, opts || {});
    var cache   = options.cache = {};

    var tagKey         = options.tagKey;
    var styleTagKey    = options.styleTagKey;
    var childrenKey    = options.childrenKey;
    var hasChildrenKey = R.has(childrenKey);
    var isStyleNode    = R.where(R.objOf(tagKey, R.equals(styleTagKey)));

    return function prefixStyleClassId (value) {
        var path        = this.path;
        var isStyle     = isStyleNode(value);
        var hasChildren = hasChildrenKey(value);

        if (this.notLeaf && isStyle && hasChildren) {
            value.children =
                value.
                children.
                map(function (child) {
                    if (typeof child === 'string') {
                        return processStyles(options, child);
                    }
                    return child;
                });
        }
        else if (this.isLeaf && path[path.length - 1] === 'className') {
            this.update(
                value.
                    replace(
                        CLASSNAME_OR_ID_REGEX,
                        function (m) {
                            if (m in cache) {
                                return cache[m];
                            }

                            return m;
                        }
                    )
            );
        }
        else if (this.isLeaf && path[path.length - 1] === 'id') {
          this.update(
              value.
                  replace(
                    CLASSNAME_OR_ID_REGEX,
                      function (m) {
                          if (m in cache) {
                              return cache[m];
                          }

                          return m;
                      }
                  )
          );
      }
      else if (this.isLeaf && path[path.length - 1] === 'xlinkHref') {
        this.update(
          value === 'spot-texture.png'
          ? value.replace('spot-texture.png', '/spot-texture.png')
          : value === 'scene-texture.png'
           ? value.replace('scene-texture.png', '/spot-texture.png')
           :
             value.
               replace(
                 ID_REGEX,
                   function (m) {
                       if (m in cache) {
                           return cache[m];
                       }

                       return m;
                   }
               )
     );
    }
    };
};
