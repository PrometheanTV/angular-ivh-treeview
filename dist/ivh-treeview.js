
/**
 * The iVantage Treeview module
 *
 * @package ivh.treeview
 */

angular.module('ivh.treeview', []);

/**
 * Selection management logic for treeviews with checkboxes
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewCheckboxHelper', [function() {
  'use strict';
  return {
    restrict: 'A',
    scope: {
      node: '=ivhTreeviewCheckboxHelper'
    },
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node
        , opts = trvw.opts()
        , indeterminateAttr = opts.indeterminateAttribute
        , selectedAttr = opts.selectedAttribute;

      // Set initial selected state of this checkbox
      scope.isSelected = node[selectedAttr];

      // Local access to the parent controller
      scope.trvw = trvw;

      // Enforce consistent behavior across browsers by making indeterminate
      // checkboxes become checked when clicked/selected using spacebar
      scope.resolveIndeterminateClick = function(node) {
        node.selectedNotAllOverlaysWithThisCategory = false;
        if(node[indeterminateAttr]) {
          // trvw.select(node, true);
        }
      };

      // Update the checkbox when the node's selected status changes
      scope.$watch('node.' + selectedAttr, function(newVal, oldVal) {
        // scope.isSelected = newVal;
      });

      // Update the checkbox when the node's indeterminate status changes
      scope.$watch('node.' + indeterminateAttr, function(newVal, oldVal) {
        element.find('input').prop('indeterminate', newVal);
      });
    },
    template: [
      '<label',
        'for="ivh-treeview-checkbox-{{node._id}}"',
        'class="ivh-treeview-checkbox"',
        'ng-class="{\'category-selected\': node.selected, \'category-part-selected\': node.selectedNotAllOverlaysWithThisCategory }">',
      '</label>',
      '<input type="checkbox"',
        'class="ivh-treeview-checkbox"',
        'ng-model="isSelected"',
        'id="ivh-treeview-checkbox-{{node._id}}"',
        'ng-click="resolveIndeterminateClick(node)"',
        ' />'
    ].join('\n')
  };
}]);



/**
 * Wrapper for a checkbox directive
 *
 * Basically exists so folks creeting custom node templates don't need to attach
 * their node to this directive explicitly - i.e. keeps consistent interface
 * with the twistie and toggle directives.
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewCheckbox', [function() {
  'use strict';
  return {
    restrict: 'AE',
    require: '^ivhTreeview',
    template: '<span ivh-treeview-checkbox-helper="node" class="ivh-treeview-checkbox-container"></span>'
  };
}]);


/**
 * The recursive step, output child nodes for the scope node
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewChildren', function() {
  'use strict';
  return {
    restrict: 'AE',
    require: '^ivhTreeviewNode',
    template: [
      '<ul ng-if="getChildren().length" class="ivh-treeview">',
        '<li ng-repeat="child in getChildren()"',
            'ng-hide="trvw.hasFilter() && !trvw.isVisible(child)"',
            'class="ivh-treeview-node"',
            'ng-class="{\'ivh-treeview-node-collapsed\': !child.expanded && !trvw.isLeaf(child)}"',
            'ivh-treeview-node="child"',
            'ivh-treeview-depth="childDepth">',
        '</li>',
      '</ul>'
    ].join('\n')
  };
});


/**
 * Treeview tree node directive
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewNode', ['ivhTreeviewCompiler', function(ivhTreeviewCompiler) {
  'use strict';
  return {
    restrict: 'A',
    scope: {
      node: '=ivhTreeviewNode',
      depth: '=ivhTreeviewDepth'
    },
    require: '^ivhTreeview',
    compile: function(tElement) {
      return ivhTreeviewCompiler
        .compile(tElement, function(scope, element, attrs, trvw) {
          var node = scope.node;

          var getChildren = scope.getChildren = function() {
            return trvw.children(node);
          };

          scope.trvw = trvw;
          scope.childDepth = scope.depth + 1;

          // Expand/collapse the node as dictated by the expandToDepth property.
          // Note that we will respect the expanded state of this node if it has
          // been expanded by e.g. `ivhTreeviewMgr.expandTo` but not yet
          // rendered.
          if(!trvw.isExpanded(node)) {
            trvw.expand(node, trvw.isInitiallyExpanded(scope.depth));
          }

          /**
           * @todo Provide a way to opt out of this
           */
          scope.$watch(function() {
            return getChildren().length > 0;
          }, function(newVal) {
            if(newVal) {
              element.removeClass('ivh-treeview-node-leaf');
            } else {
              element.addClass('ivh-treeview-node-leaf');
            }
          });
        });
    }
  };
}]);



/**
 * Toggle logic for treeview nodes
 *
 * Handles expand/collapse on click. Does nothing for leaf nodes.
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewToggle', [function() {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;

      element.addClass('ivh-treeview-toggle');

      element.bind('click', function(e) {
        node.expanded = !node.expanded;
        if(!trvw.isLeaf(node)) {
          scope.$apply(function() {
            trvw.toggleExpanded(node);
            trvw.onToggle(node, e);
          });
        }else // CBarnett - Added this to allow leaf nodes to trigger toggle event.
        {
            scope.$apply(function() {
                trvw.onToggle(node, e);
            });
        }
      });
    }
  };
}]);


// CBarnett - added new directive to seperate expand toggle from label click
angular.module('ivh.treeview').directive('ivhTreeviewLabel', [function() {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;

      element.addClass('ivh-treeview-label');
      if (node.isOverlayTypeCategory) {
        element.parent().addClass('type_category_filter');
      }

      element.bind('click', function(el) {
        if ((el.toElement || el.target).tagName === 'INPUT') return;
        if (!trvw.isMultiselect()) {
          var myEl = angular.element(document.getElementsByClassName('selected-category'));
          if (myEl) {
            myEl.removeClass('selected-category');
          }
        }

        node.isSelected = !node.isSelected;
        node.selected = !node.selected;
        node.selectedNotAllOverlaysWithThisCategory = false;
        if (el.toElement) {
          el.toElement.classList.add('selected-category');
        } else if (el.target) {
          el.target.classList.add('selected-category');
        }
        if (!trvw.isLeaf(node)) {
          scope.$apply(function() {
            // trvw.toggleExpanded(node);
            trvw.onToggle(node, el);
          });
        } else { // CBarnett - Added this to allow leaf nodes to trigger toggle event.
          scope.$apply(function() {
            trvw.onToggle(node, el);
          });
        }
      });
    }
  };
}]);

// CBarnett - added new directive to seperate expand toggle from label click
angular.module('ivh.treeview').directive('ivhTreeviewMenu', [function() {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;

      element.addClass('ivh-treeview-menu');

      element.bind('click', function(el) {
      //  console.log('category item menu click',el,node);
        scope.$apply(function() {
          trvw.onMenu(node);
        });
      });
    }
  };
}]);

/**
 * Set directives for actions, instead using global functions
 */
angular.module('ivh.treeview').directive('ivhTreeviewRemove', ['$http','$rootScope', '$mdDialog','$timeout', function($http, $rootScope, $mdDialog, $timeout) {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;

        element.bind('click', function () {
            node = scope.node;
            var title = 'Are you sure you want to delete the "' + node.label + '" category?';
            var textContent = 'All overlays currently assigned to this category will unassigned';

            var confirm = $mdDialog.confirm({
                    onShowing: function afterShowAnimation(el) {
                            $timeout(function () {
                                var $dialog = angular.element(document.querySelector('md-dialog'));
                                var $actionsSection = $dialog.find('md-dialog-actions');
                                var $cancelButton = $actionsSection.children()[0];
                                var $confirmButton = $actionsSection.children()[1];
                                angular.element($dialog).addClass('confirm_delete_category_dialog');
                                angular.element($confirmButton).addClass('confirm_category_btn');
                                angular.element($cancelButton).addClass('cancel_category_btn');
                                angular.element($actionsSection).addClass('grey_confirm_background');
                                angular.element($dialog).css({display: "flex"});
                                el.dialog.$element.css({display: "flex"});
                                if(angular.element(document.querySelector('.confirm_delete_category_dialog p')).text() == ''){
                                    angular.element(document.querySelector('.confirm_delete_category_dialog p')).text(textContent);
                                }
                            });
                        }
                    })
                    .title(title)
                    .textContent(textContent)
                    .ariaLabel(title)
                    .ok('Delete Category')
                    .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
              $http.delete('/api/overlaycategories/' + node._id).then(successCallback, errorCallback);
                function successCallback(data) {
                    $rootScope.updateCategory(true);
                }

                function errorCallback(data) {
                   // console.log(data);
                }

            }, function () {
               // console.log('Cancel Delete Selected');

            });

            //  console.log('category item menu click',el,node);
            scope.$apply(function () {
                trvw.onMenu(node);
            });
        });
    }
  };
}]);

angular.module('ivh.treeview').directive('ivhTreeviewRename', ['$http', '$compile', '$rootScope', function($http, $compile, $rootScope) {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;
      var savingInProgress = false;
      var id = CSS.escape(trvw.getNodeHash(scope.node) + '_' + node.label.replace(' ', '-'));
      var template =  '<form id="renameForm" style="margin-left: 20px;" ng-submit="rename()">'+
          '<input type="text" autofocus placeholder=" Enter Category Name" ng-model="categoryUpdate" class="enter-category-name" ng-blur="cancelRename(\''+ id +'\')" maxlength="24"/>'+
          '<p ng-if="!error" class="new_category_comment">'+
              'Press enter to add the category <br> 24 characters max.'+
          '</p>'+
          '<p ng-if="error" class="new_category_comment_error">'+
              '{{error}}'+
          '</p>'+
        '</form>';

        scope.cancelRename = function(id){
          if(document.getElementById('renameForm')) {
            angular.element(angular.element(document.getElementById('tree_node_' + id))[0].parentElement).children().removeAttr('style');
            document.getElementById('renameForm').remove();
          }
        }


        scope.rename = function(){
            if (savingInProgress === true) return;

            node = getNode();

            if (node.isSelected) delete node.isSelected;

            node.renamedValue = node.label;
            node.label = scope.categoryUpdate;

            scope.error = '';
            savingInProgress = true;
            $http.put('/api/overlaycategories/' + node._id, node).then(successCallback, errorCallback);

            function successCallback() {
              savingInProgress = false;
                $rootScope.updateCategory(true);
            }

            function errorCallback(error) {
              node.label = node.renamedValue;
              savingInProgress = false;
              scope.error = error.data && error.data.message ? error.data.message : 'Error';
            }

            function getNode() {
              if (!scope.node._id) {
                  scope.node = scope.$parent.$parent.$parent.$parent.node;
                  var childrenNode = scope.$parent.node;
                  var id = searchIndexOfObjInArr(scope.node.children, childrenNode.label);
                  return scope.node.children[id];
              }
              return scope.node;
            }
        };

        element.bind('click', function () {
            scope.categoryUpdate = node.label;

            angular.element(angular.element(document.querySelector('.library_categories  #tree_node_'+id))[0].parentElement).children().css({
                display: "none"
            });
            angular.element(document.querySelector('.library_categories #tree_node_'+id)).after($compile(template)(scope));

            scope.$apply(function () {
                trvw.onMenu(node);
            });
        });
    }
  };
}]);

function searchIndexOfObjInArr(arr, label){
    if(!arr || arr.length == 0){
        return -1;
    }
    for(var i = 0; i < arr.length; i++){
        if(arr[i].label == label){
            return i;
        }
    }
}

angular.module('ivh.treeview').directive('ivhTreeviewAddSubcategory', ['$http', '$compile', '$rootScope', function($http, $compile, $rootScope) {
  'use strict';
  return {
    restrict: 'A',
    require: '^ivhTreeview',
    link: function(scope, element, attrs, trvw) {
      var node = scope.node;
      var savingInProgress = false;

        scope.addSubcategory = function() {
            if (typeof scope.subCategory != 'undefined' && savingInProgress === false) {
                savingInProgress = true;
                var newCategory = {
                  parents: [node.label],
                  label: scope.subCategory
                };
                $http.post('/api/overlaycategories/', newCategory)
                .then(function successCallback() {
                  $rootScope.updateCategory(true);
                  scope.error = '';
                  savingInProgress = false;
                  scope.subCategory = undefined;
                }, function errorCallback(error) {
                  savingInProgress = false;
                  scope.error = error.data && error.data.message ? error.data.message : 'Error';
                });
            }
        };
        scope.cancel = function(){
          if(document.getElementById('addSubcategoryForm')) {
            document.getElementById('addSubcategoryForm').remove();
            scope.subCategory = '';
          }
        }
        var id;

        element.bind('click', function () {
            if (!document.getElementById('addSubcategoryForm')) {
                var marginLeft = 20;
                var template = '<form id="addSubcategoryForm" style="margin-left: ' + marginLeft + 'px; margin-top: 10px;" ng-submit="addSubcategory()">' +
                        '<input type="text" autofocus placeholder=" Enter Category Name" ng-model="subCategory" class="enter-category-name" ng-blur="cancel()" maxlength="24"/>' +
                        '<p ng-hide="error" class="new_category_comment">' +
                        'Press enter to add the category <br> 24 characters max.' +
                        '</p>' +
                        '<p ng-show="error" class="new_category_comment_error">'+
                          '{{error}}'+
                        '</p>'+
                        '</form>';
                scope.error = '';
                scope.categoryUpdate = node.label;
                var id = CSS.escape(trvw.getNodeHash(scope.node) + '_' + node.label.replace(' ', '-'));
                var el = angular.element(angular.element(document.querySelector('.library_categories #tree_node_' + id).parentElement.parentElement));

                angular.element(el[el.length - 1]).append($compile(template)(scope));

                scope.$apply(function () {
                    trvw.onMenu(node);
                });
            }
        });
    }
  };
}]);

/**
 * Treeview twistie directive
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewTwistie', ['$compile', 'ivhTreeviewOptions', function($compile, ivhTreeviewOptions) {
  'use strict';

  var globalOpts = ivhTreeviewOptions();

  return {
    restrict: 'A',
    require: '^ivhTreeview',
    template: [
      '<span class="ivh-treeview-twistie">',
        '<span class="ivh-treeview-twistie-collapsed">',
          globalOpts.twistieCollapsedTpl,
        '</span>',
        '<span class="ivh-treeview-twistie-expanded">',
          globalOpts.twistieExpandedTpl,
        '</span>',
        '<span class="ivh-treeview-twistie-leaf">',
          globalOpts.twistieLeafTpl,
        '</span>',
      '</span>'
    ].join('\n'),
    link: function(scope, element, attrs, trvw) {

      if(!trvw.hasLocalTwistieTpls) {
        return;
      }

      var opts = trvw.opts()
        , $twistieContainers = element
          .children().eq(0) // Template root
          .children(); // The twistie spans

      angular.forEach([
        // Should be in the same order as elements in template
        'twistieCollapsedTpl',
        'twistieExpandedTpl',
        'twistieLeafTpl'
      ], function(tplKey, ix) {
        var tpl = opts[tplKey]
          , tplGlobal = globalOpts[tplKey];

        // Do nothing if we don't have a new template
        if(!tpl || tpl === tplGlobal) {
          return;
        }

        // Super gross, the template must actually be an html string, we won't
        // try too hard to enforce this, just don't shoot yourself in the foot
        // too badly and everything will be alright.
        if(tpl.substr(0, 1) !== '<' || tpl.substr(-1, 1) !== '>') {
          tpl = '<span>' + tpl + '</span>';
        }

        var $el = $compile(tpl)(scope)
          , $container = $twistieContainers.eq(ix);

        // Clean out global template and append the new one
        $container.html('').append($el);
      });

    }
  };
}]);


/**
 * The `ivh-treeview` directive
 *
 * A filterable tree view with checkbox support.
 *
 * Example:
 *
 * ```
 * <div
 *   ivh-treeview="myHierarchicalData">
 *   ivh-treeview-filter="myFilterText">
 * </div>
 * ```
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeview', ['ivhTreeviewMgr', function(ivhTreeviewMgr) {
  'use strict';
  return {
    restrict: 'A',
    transclude: true,
    scope: {
      // The tree data store
      root: '=ivhTreeview',

      // Specific config options
      childrenAttribute: '=ivhTreeviewChildrenAttribute',
      defaultSelectedState: '=ivhTreeviewDefaultSelectedState',
      expandToDepth: '=ivhTreeviewExpandToDepth',
      idAttribute: '=ivhTreeviewIdAttribute',
      indeterminateAttribute: '=ivhTreeviewIndeterminateAttribute',
      expandedAttribute: '=ivhTreeviewExpandedAttribute',
      labelAttribute: '=ivhTreeviewLabelAttribute',
      nodeTpl: '=ivhTreeviewNodeTpl',
      selectedAttribute: '=ivhTreeviewSelectedAttribute',
      onCbChange: '&ivhTreeviewOnCbChange',
      onToggle: '&ivhTreeviewOnToggle',
      onMenu: '&ivhTreeviewOnMenu',
      twistieCollapsedTpl: '=ivhTreeviewTwistieCollapsedTpl',
      twistieExpandedTpl: '=ivhTreeviewTwistieExpandedTpl',
      twistieLeafTpl: '=ivhTreeviewTwistieLeafTpl',
      useCheckboxes: '=ivhTreeviewUseCheckboxes',
      hideNodeCount: '=hideNodeCount',
      validate: '=ivhTreeviewValidate',
      visibleAttribute: '=ivhTreeviewVisibleAttribute',
      isMultiselect: '=ivhTreeviewMultiselect',

      // Generic options object
      userOptions: '=ivhTreeviewOptions',

      // The filter
      filter: '=ivhTreeviewFilter'
    },
    controllerAs: 'trvw',
    controller: ['$scope', '$element', '$attrs', '$transclude', 'ivhTreeviewOptions', 'filterFilter', function($scope, $element, $attrs, $transclude, ivhTreeviewOptions, filterFilter) {
      var ng = angular
        , trvw = this;

      // Merge any locally set options with those registered with hte
      // ivhTreeviewOptions provider
      var localOpts = ng.extend({}, ivhTreeviewOptions(), $scope.userOptions);

      // Two-way bound attributes (=) can be copied over directly if they're
      // non-empty
      ng.forEach([
        'childrenAttribute',
        'defaultSelectedState',
        'expandToDepth',
        'idAttribute',
        'indeterminateAttribute',
        'expandedAttribute',
        'labelAttribute',
        'nodeTpl',
        'selectedAttribute',
        'twistieCollapsedTpl',
        'twistieExpandedTpl',
        'twistieLeafTpl',
        'useCheckboxes',
        'hideNodeCount',
        'validate',
        'visibleAttribute',
        'isMultiselect'
      ], function(attr) {
        if(ng.isDefined($scope[attr])) {
          localOpts[attr] = $scope[attr];
        }
      });

      // Attrs with the `&` prefix will yield a defined scope entity even if
      // no value is specified. We must check to make sure the attribute string
      // is non-empty before copying over the scope value.
      var normedAttr = function(attrKey) {
        return 'ivhTreeview' +
          attrKey.charAt(0).toUpperCase() +
          attrKey.slice(1);
      };

      ng.forEach([
        'onCbChange',
        'onToggle',
        'onMenu'
      ], function(attr) {
        if($attrs[normedAttr(attr)]) {
          localOpts[attr] = $scope[attr];
        }
      });

      // Treat the transcluded content (if there is any) as our node template
      var transcludedScope;
      $transclude(function(clone, scope) {
        var transcludedNodeTpl = '';
        angular.forEach(clone, function(c) {
          transcludedNodeTpl += (c.innerHTML || '').trim();
        });
        if(transcludedNodeTpl.length) {
          transcludedScope = scope;
          localOpts.nodeTpl = transcludedNodeTpl;
        }
      });

      /**
       * Get the merged global and local options
       *
       * @return {Object} the merged options
       */
      trvw.opts = function() {
        return localOpts;
      };

      // If we didn't provide twistie templates we'll be doing a fair bit of
      // extra checks for no reason. Let's just inform down stream directives
      // whether or not they need to worry about twistie non-global templates.
      var userOpts = $scope.userOptions || {};

      /**
       * Whether or not we have local twistie templates
       *
       * @private
       */
      trvw.hasLocalTwistieTpls = !!(
        userOpts.twistieCollapsedTpl ||
        userOpts.twistieExpandedTpl ||
        userOpts.twistieLeafTpl ||
        $scope.twistieCollapsedTpl ||
        $scope.twistieExpandedTpl ||
        $scope.twistieLeafTpl);

      /**
       * Get the child nodes for `node`
       *
       * Abstracts away the need to know the actual label attribute in
       * templates.
       *
       * @param {Object} node a tree node
       * @return {Array} the child nodes
       */
      trvw.children = function(node) {
        var children = node[localOpts.childrenAttribute];
        return ng.isArray(children) ? children : [];
      };

      /**
       * Get the label for `node`
       *
       * Abstracts away the need to know the actual label attribute in
       * templates.
       *
       * @param {Object} node A tree node
       * @return {String} The node label
       */
      trvw.label = function(node) {
        return node[localOpts.labelAttribute];
      };

      trvw.count = function(node) {
        if (!node || !node.count || trvw.hideNodeCount()) {
          return;
        }

        var count = node && node.count ? node.count.length : 0;
        var str = '(' + count + ')';
        return str;
      };

      trvw.getClass = function(node) {
        var elementClass = '';
        if (node.selected || node.selectedNotAllOverlaysWithThisCategory) {
          elementClass += ' selected-category';
        }
        if (node.class) {
          elementClass += ' ' + node.class;
        }
        return elementClass;
      };

      trvw.getNodeHash = function(node) {
        return node.$$hashKey ? node.$$hashKey : ''
      };

      /**
       * Returns `true` if this treeview has a filter
       *
       * @return {Boolean} Whether on not we have a filter
       * @private
       */
      trvw.hasFilter = function() {
        return ng.isDefined($scope.filter);
      };

      /**
       * Get the treeview filter
       *
       * @return {String} The filter string
       * @private
       */
      trvw.getFilter = function() {
        return $scope.filter || '';
      };

      /**
       * Returns `true` if current filter should hide `node`, false otherwise
       *
       * @todo Note that for object and function filters each node gets hit with
       * `isVisible` N-times where N is its depth in the tree. We may be able to
       * optimize `isVisible` in this case by:
       *
       * - On first call to `isVisible` in a given digest cycle walk the tree to
       *   build a flat array of nodes.
       * - Run the array of nodes through the filter.
       * - Build a map (`id`/$scopeId --> true) for the nodes that survive the
       *   filter
       * - On subsequent calls to `isVisible` just lookup the node id in our
       *   map.
       * - Clean the map with a $timeout (?)
       *
       * In theory the result of a call to `isVisible` could change during a
       * digest cycle as scope variables are updated... I think calls would
       * happen bottom up (i.e. from "leaf" to "root") so that might not
       * actually be an issue. Need to investigate if this ends up feeling for
       * large/deep trees.
       *
       * @param {Object} node A tree node
       * @return {Boolean} Whether or not `node` is filtered out
       */
      trvw.isVisible = function(node) {
        var filter = trvw.getFilter();

        // Quick shortcut
        if(!filter || filterFilter([node], filter).length) {
          return true;
        }

        // If we have an object or function filter we have to check children
        // separately
        if(typeof filter === 'object' || typeof filter === 'function') {
          var children = trvw.children(node);
          // If any child is visible then so is this node
          for(var ix = children.length; ix--;) {
            if(trvw.isVisible(children[ix])) {
              return true;
            }
          }
        }

        return false;
      };

      /**
       * Returns `true` if we should use checkboxes, false otherwise
       *
       * @return {Boolean} Whether or not to use checkboxes
       */
      trvw.useCheckboxes = function() {
        return localOpts.useCheckboxes;
      };

      /**
       * Returns `true` if we should use checkboxes, false otherwise
       *
       * @return {Boolean} Whether or not to use checkboxes
       */
      trvw.hideNodeCount = function() {
        return localOpts.hideNodeCount;
      };

      /**
       * Returns `true` if we should select multiple categories, false otherwise
       *
       * @return {Boolean} Whether or not to select multiple categories
       */
      trvw.isMultiselect = function() {
        return localOpts.isMultiselect;
      };

      /**
       * Select or deselect `node`
       *
       * Updates parent and child nodes appropriately, `isSelected` defaults to
       * `true`.
       *
       * @param {Object} node The node to select or deselect
       * @param {Boolean} isSelected Defaults to `true`
       */
      trvw.select = function(node, isSelected) {
        ivhTreeviewMgr.select($scope.root, node, localOpts, isSelected);
        trvw.onCbChange(node, isSelected);
      };

      /**
       * Get the selected state of `node`
       *
       * @param {Object} node The node to get the selected state of
       * @return {Boolean} `true` if `node` is selected
       */
      trvw.isSelected = function(node) {
        return node[localOpts.selectedAttribute];
      };

      /**
       * Toggle the selected state of `node`
       *
       * Updates parent and child node selected states appropriately.
       *
       * @param {Object} node The node to update
       */
      trvw.toggleSelected = function(node) {
        var isSelected = !node[localOpts.selectedAttribute];
        trvw.select(node, isSelected);
      };

      /**
       * Expand or collapse a given node
       *
       * `isExpanded` is optional and defaults to `true`.
       *
       * @param {Object} node The node to expand/collapse
       * @param {Boolean} isExpanded Whether to expand (`true`) or collapse
       */
      trvw.expand = function(node, isExpanded) {
        ivhTreeviewMgr.expand($scope.root, node, localOpts, isExpanded);
      };

      /**
       * Get the expanded state of a given node
       *
       * @param {Object} node The node to check the expanded state of
       * @return {Boolean}
       */
      trvw.isExpanded = function(node) {
        return node[localOpts.expandedAttribute];
      };

      /**
       * Toggle the expanded state of a given node
       *
       * @param {Object} node The node to toggle
       */
      trvw.toggleExpanded = function(node) {
        trvw.expand(node, !trvw.isExpanded(node));
      };

      /**
       * Whether or not nodes at `depth` should be expanded by default
       *
       * Use -1 to fully expand the tree by default.
       *
       * @param {Integer} depth The depth to expand to
       * @return {Boolean} Whether or not nodes at `depth` should be expanded
       * @private
       */
      trvw.isInitiallyExpanded = function(depth) {
        var expandTo = localOpts.expandToDepth === -1 ?
          Infinity : localOpts.expandToDepth;
        return depth < expandTo;
      };

      /**
       * Returns `true` if `node` is a leaf node
       *
       * @param {Object} node The node to check
       * @return {Boolean} `true` if `node` is a leaf
       */
      trvw.isLeaf = function(node) {
        return trvw.children(node).length === 0;
      };

      /**
       * Get the tree node template
       *
       * @return {String} The node template
       * @private
       */
      trvw.getNodeTpl = function() {
        return localOpts.nodeTpl;
      };

      /**
       * Get the root of the tree
       *
       * Mostly a helper for custom templates
       *
       * @return {Object|Array} The tree root
       * @private
       */
      trvw.root = function() {
        return $scope.root;
      };

      /**
       * Call the registered toggle handler
       *
       * Handler will get a reference to `node` and the root of the tree.
       *
       * @param {Object} node Tree node to pass to the handler
       * @private
       */
      trvw.onToggle = function(node, event) {
        var element = event.toElement || event.target;
        if(localOpts.onToggle && !element.classList.contains('glyphicon')) {
          var locals = {
            ivhNode: node,
            ivhIsExpanded: trvw.isExpanded(node),
            ivhTree: $scope.root
          };
          localOpts.onToggle(locals);
        }
      };

      /**
       * Call the registered toggle handler
       *
       * Handler will get a reference to `node` and the root of the tree.
       *
       * @param {Object} node Tree node to pass to the handler
       * @private
       */
      trvw.onMenu = function(node) {
        if(localOpts.onMenu) {
          var locals = {
            ivhNode: node,
            ivhIsExpanded: trvw.isExpanded(node),
            ivhTree: $scope.root
          };
          localOpts.onMenu(locals);
        }
      };

      /**
       * Call the registered selection change handler
       *
       * Handler will get a reference to `node`, the new selected state of
       * `node, and the root of the tree.
       *
       * @param {Object} node Tree node to pass to the handler
       * @param {Boolean} isSelected Selected state for `node`
       * @private
       */
      trvw.onCbChange = function(node, isSelected) {
        if(localOpts.onCbChange) {
          var locals = {
            ivhNode: node,
            ivhIsSelected: isSelected,
            ivhTree: $scope.root
          };
          localOpts.onCbChange(locals);
        }
      };

    }],
    link: function(scope, element, attrs) {
      var opts = scope.trvw.opts();

      // Allow opt-in validate on startup
      if(opts.validate) {
        ivhTreeviewMgr.validate(scope.root, opts);
      }
    },
    template: [
      '<ul class="ivh-treeview">',
        '<li ng-repeat="child in root | ivhTreeviewAsArray"',
            'ng-hide="trvw.hasFilter() && !trvw.isVisible(child)"',
            'class="ivh-treeview-node"',
            'ng-class="{\'ivh-treeview-node-collapsed\': !child.expanded && !trvw.isLeaf(child)}"',
            'ivh-treeview-node="child"',
            'ivh-treeview-depth="0">',
        '</li>',
      '</ul>'
    ].join('\n')
  };
}]);


angular.module('ivh.treeview').filter('ivhTreeviewAsArray', function() {
  'use strict';
  return function(arr) {
    if(!angular.isArray(arr) && angular.isObject(arr)) {
      return [arr];
    }
    return arr;
  };
});


/**
 * Breadth first searching for treeview data stores
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').factory('ivhTreeviewBfs', ['ivhTreeviewOptions', function(ivhTreeviewOptions) {
  'use strict';

  var ng = angular;

  /**
   * Breadth first search of `tree`
   *
   * `opts` is optional and may override settings from `ivhTreeviewOptions.options`.
   * The callback `cb` will be invoked on each node in the tree as we traverse,
   * if it returns `false` traversal of that branch will not continue. The
   * callback is given the current node as the first parameter and the node
   * ancestors, from closest to farthest, as an array in the second parameter.
   *
   * @param {Array|Object} tree The tree data
   * @param {Object} opts [optional] Settings overrides
   * @param {Function} cb [optional] Callback to run against each node
   */
  return function(tree, opts, cb) {
    if(arguments.length === 2 && ng.isFunction(opts)) {
      cb = opts;
      opts = {};
    }
    opts = angular.extend({}, ivhTreeviewOptions(), opts);
    cb = cb || ng.noop;

    var queue = []
      , childAttr = opts.childrenAttribute
      , next, node, parents, ix, numChildren;

    if(ng.isArray(tree)) {
      ng.forEach(tree, function(n) {
        // node and parents
        queue.push([n, []]);
      });
      next = queue.shift();
    } else {
      // node and parents
      next = [tree, []];
    }

    while(next) {
      node = next[0];
      parents = next[1];
      // cb might return `undefined` so we have to actually check for equality
      // against `false`
      if(cb(node, parents) !== false) {
        if(node[childAttr] && ng.isArray(node[childAttr])) {
          numChildren = node[childAttr].length;
          for(ix = 0; ix < numChildren; ix++) {
            queue.push([node[childAttr][ix], [node].concat(parents)]);
          }
        }
      }
      next = queue.shift();
    }
  };
}]);


/**
 * Compile helper for treeview nodes
 *
 * Defers compilation until after linking parents. Otherwise our treeview
 * compilation process would recurse indefinitely.
 *
 * Thanks to http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').factory('ivhTreeviewCompiler', ['$compile', function($compile) {
  'use strict';
  return {
    /**
     * Manually compiles the element, fixing the recursion loop.
     * @param {Object} element The angular element or template
     * @param {Function} link [optional] A post-link function, or an object with function(s) registered via pre and post properties.
     * @returns An object containing the linking functions.
     */
    compile: function(element, link) {
      // Normalize the link parameter
      if(angular.isFunction(link)) {
        link = { post: link };
      }

      var compiledContents;
      return {
        pre: (link && link.pre) ? link.pre : null,
        /**
         * Compiles and re-adds the contents
         */
        post: function(scope, element, attrs, trvw) {
          // Compile our template
          if(!compiledContents) {
            compiledContents = $compile(trvw.getNodeTpl());
          }
          // Add the compiled template
          compiledContents(scope, function(clone) {
            element.append(clone);
          });

          // Call the post-linking function, if any
          if(link && link.post) {
            link.post.apply(null, arguments);
          }
        }
      };
    }
  };
}]);


/**
 * Manager for treeview data stores
 *
 * Used to assist treeview operations, e.g. selecting or validating a tree-like
 * collection.
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview')
  .factory('ivhTreeviewMgr', ['ivhTreeviewOptions', 'ivhTreeviewBfs', function(ivhTreeviewOptions, ivhTreeviewBfs) {
    'use strict';

    var ng = angular
      , options = ivhTreeviewOptions()
      , exports = {};

    // The make* methods and validateParent need to be bound to an options
    // object
    var makeDeselected = function(node) {
      node[this.selectedAttribute] = false;
      node[this.indeterminateAttribute] = false;
    };

    var makeSelected = function(node) {
      node[this.selectedAttribute] = true;
      node[this.indeterminateAttribute] = false;
    };

    var validateParent = function(node) {
//      var children = node[this.childrenAttribute]
//        , selectedAttr = this.selectedAttribute
//        , indeterminateAttr = this.indeterminateAttribute
//        , numSelected = 0
//        , numIndeterminate = 0;
//      ng.forEach(children, function(n, ix) {
//        if(n[selectedAttr]) {
//          numSelected++;
//        } else {
//          if(n[indeterminateAttr]) {
//            numIndeterminate++;
//          }
//        }
//      });
//
      //Fixed aoutoselecting and uselecting of parent category
//      if(0 === numSelected && 0 === numIndeterminate) {
//        node[selectedAttr] = false;
//        node[indeterminateAttr] = false;
//      } else if(numSelected === children.length) {
//        node[selectedAttr] = true;
//        node[indeterminateAttr] = false;
//      } else {
//        node[selectedAttr] = false;
//        node[indeterminateAttr] = true;
//      }
    };

    var findNode = function(tree, node, opts, cb) {
      var useId = isId(node)
        , proceed = true
        , idAttr = opts.idAttribute;

      // Our return values
      var foundNode = null
        , foundParents = [];

      ivhTreeviewBfs(tree, opts, function(n, p) {
        var isNode = proceed && (useId ?
          node === n[idAttr] :
          node === n);

        if(isNode) {
          // I've been looking for you all my life
          proceed = false;
          foundNode = n;
          foundParents = p;
        }

        return proceed;
      });

      return cb(foundNode, foundParents);
    };

    var isId = function(val) {
      return ng.isString(val) || ng.isNumber(val);
    };

    /**
     * Select (or deselect) a tree node
     *
     * This method will update the rest of the tree to account for your change.
     *
     * You may alternatively pass an id as `node`, in which case the tree will
     * be searched for your item.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to (de)select
     * @param {Object} opts [optional] Options to override default options with
     * @param {Boolean} isSelected [optional] Whether or not to select `node`, defaults to `true`
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.select = function(tree, node, opts, isSelected) {
      if(arguments.length > 2) {
        if(typeof opts === 'boolean') {
          isSelected = opts;
          opts = {};
        }
      }
      opts = ng.extend({}, options, opts);
      isSelected = ng.isDefined(isSelected) ? isSelected : true;

      var useId = isId(node)
        , proceed = true
        , idAttr = opts.idAttribute;

      ivhTreeviewBfs(tree, opts, function(n, p) {
        var isNode = proceed && (useId ?
          node === n[idAttr] :
          node === n);

        if(isNode) {
          // I've been looking for you all my life
          proceed = false;

          var cb = isSelected ?
            makeSelected.bind(opts) :
            makeDeselected.bind(opts);

          ivhTreeviewBfs(n, opts, cb);
          ng.forEach(p, validateParent.bind(opts));
        }

        return proceed;
      });

      return exports;
    };

    /**
     * Select all nodes in a tree
     *
     * `opts` will default to an empty object, `isSelected` defaults to `true`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object} opts [optional] Default options overrides
     * @param {Boolean} isSelected [optional] Whether or not to select items
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.selectAll = function(tree, opts, isSelected) {
      if(arguments.length > 1) {
        if(typeof opts === 'boolean') {
          isSelected = opts;
          opts = {};
        }
      }

      opts = ng.extend({}, options, opts);
      isSelected = ng.isDefined(isSelected) ? isSelected : true;

      var selectedAttr = opts.selectedAttribute
        , indeterminateAttr = opts.indeterminateAttribute;

      ivhTreeviewBfs(tree, opts, function(node) {
        node[selectedAttr] = isSelected;
        node[indeterminateAttr] = false;
      });

      return exports;
    };

    /**
     * Select or deselect each of the passed items
     *
     * Eventually it would be nice if this did something more intelligent than
     * just calling `select` on each item in the array...
     *
     * @param {Object|Array} tree The tree data
     * @param {Array} nodes The array of nodes or node ids
     * @param {Object} opts [optional] Default options overrides
     * @param {Boolean} isSelected [optional] Whether or not to select items
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.selectEach = function(tree, nodes, opts, isSelected) {
      /**
       * @todo Surely we can do something better than this...
       */
      ng.forEach(nodes, function(node) {
        exports.select(tree, node, opts, isSelected);
      });
      return exports;
    };

    /**
     * Deselect a tree node
     *
     * Delegates to `ivhTreeviewMgr.select` with `isSelected` set to `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to (de)select
     * @param {Object} opts [optional] Options to override default options with
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.deselect = function(tree, node, opts) {
      return exports.select(tree, node, opts, false);
    };

    /**
     * Deselect all nodes in a tree
     *
     * Delegates to `ivhTreeviewMgr.selectAll` with `isSelected` set to `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object} opts [optional] Default options overrides
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.deselectAll = function(tree, opts) {
      return exports.selectAll(tree, opts, false);
    };

    /**
     * Deselect each of the passed items
     *
     * Delegates to `ivhTreeviewMgr.selectEach` with `isSelected` set to
     * `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Array} nodes The array of nodes or node ids
     * @param {Object} opts [optional] Default options overrides
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.deselectEach = function(tree, nodes, opts) {
      return exports.selectEach(tree, nodes, opts, false);
    };

    /**
     * Validate tree for parent/child selection consistency
     *
     * Assumes `bias` as default selected state. The first element with
     * `node.select !== bias` will be assumed correct. For example, if `bias` is
     * `true` (the default) we'll traverse the tree until we come to an
     * unselected node at which point we stop and deselect each of that node's
     * children (and their children, etc.).
     *
     * Indeterminate states will also be resolved.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object} opts [optional] Options to override default options with
     * @param {Boolean} bias [optional] Default selected state
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.validate = function(tree, opts, bias) {
      if(!tree) {
        // Guard against uninitialized trees
        return exports;
      }

      if(arguments.length > 1) {
        if(typeof opts === 'boolean') {
          bias = opts;
          opts = {};
        }
      }
      opts = ng.extend({}, options, opts);
      bias = ng.isDefined(bias) ? bias : opts.defaultSelectedState;

      var selectedAttr = opts.selectedAttribute
        , indeterminateAttr = opts.indeterminateAttribute;

      ivhTreeviewBfs(tree, opts, function(node, parents) {
        if(ng.isDefined(node[selectedAttr]) && node[selectedAttr] !== bias) {
          //exports.select(tree, node, opts, !bias);
          node[selectedAttr] = true;
          node[indeterminateAttr] = true;
          return false;
        } else {
          node[selectedAttr] = bias;
          node[indeterminateAttr] = false;
        }
      });

      return exports;
    };

    /**
     * Expand/collapse a given tree node
     *
     * `node` may be either an actual tree node object or a node id.
     *
     * `opts` may override any of the defaults set by `ivhTreeviewOptions`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to expand/collapse
     * @param {Object} opts [optional] Options to override default options with
     * @param {Boolean} isExpanded [optional] Whether or not to expand `node`, defaults to `true`
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.expand = function(tree, node, opts, isExpanded) {
      if(arguments.length > 2) {
        if(typeof opts === 'boolean') {
          isExpanded = opts;
          opts = {};
        }
      }
      opts = ng.extend({}, options, opts);
      isExpanded = ng.isDefined(isExpanded) ? isExpanded : true;

      var useId = isId(node)
        , expandedAttr = opts.expandedAttribute;

      if(!useId) {
        // No need to do any searching if we already have the node in hand
        node[expandedAttr] = isExpanded;
        return exports;
      }

      return findNode(tree, node, opts, function(n, p) {
        n[expandedAttr] = isExpanded;
        return exports;
      });
    };

    /**
     * Expand/collapse a given tree node and its children
     *
     * `node` may be either an actual tree node object or a node id. You may
     * leave off `node` entirely to expand/collapse the entire tree, however, if
     * you specify a value for `opts` or `isExpanded` you must provide a value
     * for `node`.
     *
     * `opts` may override any of the defaults set by `ivhTreeviewOptions`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node [optional*] The node (or id) to expand/collapse recursively
     * @param {Object} opts [optional] Options to override default options with
     * @param {Boolean} isExpanded [optional] Whether or not to expand `node`, defaults to `true`
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.expandRecursive = function(tree, node, opts, isExpanded) {
      if(arguments.length > 2) {
        if(typeof opts === 'boolean') {
          isExpanded = opts;
          opts = {};
        }
      }
      node = ng.isDefined(node) ? node : tree;
      opts = ng.extend({}, options, opts);
      isExpanded = ng.isDefined(isExpanded) ? isExpanded : true;

      var useId = isId(node)
        , expandedAttr = opts.expandedAttribute
        , branch;

      // If we have an ID first resolve it to an actual node in the tree
      if(useId) {
        findNode(tree, node, opts, function(n, p) {
          branch = n;
        });
      } else {
        branch = node;
      }

      if(branch) {
        ivhTreeviewBfs(branch, opts, function(n, p) {
          n[expandedAttr] = isExpanded;
        });
      }

      return exports;
    };

    /**
     * Collapse a given tree node
     *
     * Delegates to `exports.expand` with `isExpanded` set to `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to collapse
     * @param {Object} opts [optional] Options to override default options with
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.collapse = function(tree, node, opts) {
      return exports.expand(tree, node, opts, false);
    };

    /**
     * Collapse a given tree node and its children
     *
     * Delegates to `exports.expandRecursive` with `isExpanded` set to `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to expand/collapse recursively
     * @param {Object} opts [optional] Options to override default options with
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.collapseRecursive = function(tree, node, opts, isExpanded) {
      return exports.expandRecursive(tree, node, opts, false);
    };

    /**
     * Expand[/collapse] all parents of a given node, i.e. "reveal" the node
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to expand to
     * @param {Object} opts [optional] Options to override default options with
     * @param {Boolean} isExpanded [optional] Whether or not to expand parent nodes
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.expandTo = function(tree, node, opts, isExpanded) {
      if(arguments.length > 2) {
        if(typeof opts === 'boolean') {
          isExpanded = opts;
          opts = {};
        }
      }
      opts = ng.extend({}, options, opts);
      isExpanded = ng.isDefined(isExpanded) ? isExpanded : true;

      var expandedAttr = opts.expandedAttribute;

      var expandCollapseNode = function(n) {
        n[expandedAttr] = isExpanded;
      };

      // Even if wer were given the actual node and not its ID we must still
      // traverse the tree to find that node's parents.
      return findNode(tree, node, opts, function(n, p) {
        ng.forEach(p, expandCollapseNode);
        return exports;
      });
    };

    /**
     * Collapse all parents of a give node
     *
     * Delegates to `exports.expandTo` with `isExpanded` set to `false`.
     *
     * @param {Object|Array} tree The tree data
     * @param {Object|String} node The node (or id) to expand to
     * @param {Object} opts [optional] Options to override default options with
     * @return {Object} Returns the ivhTreeviewMgr instance for chaining
     */
    exports.collapseParents = function(tree, node, opts) {
      return exports.expandTo(tree, node, opts, false);
    };

    return exports;
  }
]);


/**
 * Global options for ivhTreeview
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').provider('ivhTreeviewOptions', function() {
  'use strict';

  var options = {
    /**
     * ID attribute
     *
     * For selecting nodes by identifier rather than reference
     */
    idAttribute: 'id',

    /**
     * Collection item attribute to use for labels
     */
    labelAttribute: 'label',

    /**
     * Collection item attribute to use for child nodes
     */
    childrenAttribute: 'children',

    /**
     * Collection item attribute to use for selected state
     */
    selectedAttribute: 'selected',

    /**
     * Controls whether branches are initially expanded or collapsed
     *
     * A value of `0` means the tree will be entirely collapsd (the default
     * state) otherwise branches will be expanded up to the specified depth. Use
     * `-1` to have the tree entirely expanded.
     */
    expandToDepth: 0,

    /**
     * Whether or not to use checkboxes
     *
     * If `false` the markup to support checkboxes is not included in the
     * directive.
     */
    useCheckboxes: true,

     /**
     * Whether or not to show node count
     *
     * If `true` the showing node count is not included in the
     * directive.
     */
    hideNodeCount: false,

     /**
     * Whether or not to select multiple categories
     *
     * If `false` the selecting multiple categories is not included in the
     * directive.
     */
    multiselect: false,

    /**
     * Whether or not directive should validate treestore on startup
     */
    validate: true,

    /**
     * (internal) Collection item attribute to track intermediate states
     */
    indeterminateAttribute: '__ivhTreeviewIndeterminate',

    /**
     * (internal) Collection item attribute to track expanded status
     */
    expandedAttribute: '__ivhTreeviewExpanded',

    /**
     * Default selected state when validating
     */
    defaultSelectedState: true,

    /**
     * Template for expanded twisties
     */
    twistieExpandedTpl: '(-)',

    /**
     * Template for collapsed twisties
     */
    twistieCollapsedTpl: '(+)',

    /**
     * Template for leaf twisties (i.e. no children)
     */
    twistieLeafTpl: 'o',

    /**
     * Template for tree nodes
     */
    nodeTpl: [
      '<div class="ivh-treeview-node-content" title="{{trvw.label(node)}}" >',
        '<span ivh-treeview-toggle>',
          '<span class="ivh-treeview-twistie-wrapper" ivh-treeview-twistie></span>',
        '</span>',
        '<span class="ivh-treeview-checkbox-wrapper" ng-if="trvw.useCheckboxes()"',
            'ivh-treeview-checkbox>',
        '</span>',
        '<span class="ivh-treeview-node-label" ivh-treeview-label id="tree_node_{{trvw.label(node).replace(\' \',\'-\')}}">',
          '{{trvw.label(node)}}',
        '</span>',
        '<span class="ivh-treeview-node-menu" ivh-treeview-menu style="float:right;" ><md-icon>more_vert</md-icon>',
        '</span>',

        '<div ivh-treeview-children></div>',
      '</div>'
    ].join('\n')
  };

  /**
   * Update global options
   *
   * @param {Object} opts options object to override defaults with
   */
  this.set = function(opts) {

    angular.extend(options, opts);
  };

  this.$get = function() {
    /**
     * Get a copy of the global options
     *
     * @return {Object} The options object
     */
    return function() {
      return angular.copy(options);
    };
  };
});
