/* Tiny template runtime: renders {{holes}}, <sc-for>, <sc-if> and onClick
   handlers from a <template id="dc-template"> using window.Component. */
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    schedule();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  window.DCLogic = DCLogic;

  var HOLE_ONLY = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length && v != null; i++) v = v[parts[i]];
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }
  function raw(str, scope) {
    var m = str.match(HOLE_ONLY);
    return m ? lookup(m[1], scope) : interp(str, scope);
  }

  function renderChildren(src, scope, out) {
    for (var n = src.firstChild; n; n = n.nextSibling) renderNode(n, scope, out);
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(node.nodeValue.indexOf('{{') > -1 ? interp(node.nodeValue, scope) : node.nodeValue));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-for') {
      var list = raw(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        renderChildren(node, s, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      if (raw(node.getAttribute('value') || '', scope)) renderChildren(node, scope, out);
      return;
    }

    var el = node.namespaceURI === 'http://www.w3.org/2000/svg'
      ? document.createElementNS(node.namespaceURI, node.tagName)
      : document.createElement(tag);
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name;
      if (name.indexOf('hint-') === 0) continue;
      if (/^on[a-z]+$/.test(name) && HOLE_ONLY.test(at.value)) {
        var fn = raw(at.value, scope);
        if (typeof fn === 'function') el.addEventListener(name.slice(2), fn);
        continue;
      }
      var val = at.value.indexOf('{{') > -1 ? raw(at.value, scope) : at.value;
      if (val === undefined || val === null) continue;
      if (node.namespaceURI === 'http://www.w3.org/2000/svg') el.setAttributeNS(null, name, String(val));
      else el.setAttribute(name, String(val));
    }
    if (tag === 'template') {
      el.content.appendChild(node.content.cloneNode(true));
    } else {
      renderChildren(node, scope, el);
    }
    out.appendChild(el);
  }

  var comp, tpl, root, pending = false;

  function focusables() {
    return Array.prototype.slice.call(root.querySelectorAll('a[href], button, input, select, textarea, summary'));
  }

  function render() {
    pending = false;
    // Keep open <details>, focus and scroll position across re-renders.
    var open = Array.prototype.map.call(root.querySelectorAll('details'), function (d) { return d.open; });
    var fIndex = focusables().indexOf(document.activeElement);
    var sx = window.scrollX, sy = window.scrollY;

    var frag = document.createDocumentFragment();
    renderChildren(tpl.content, comp.renderVals() || {}, frag);
    root.replaceChildren(frag);

    root.querySelectorAll('details').forEach(function (d, i) { if (open[i]) d.open = true; });
    if (fIndex > -1) { var f = focusables()[fIndex]; if (f) f.focus({ preventScroll: true }); }
    window.scrollTo(sx, sy);
  }
  function schedule() {
    if (!pending) { pending = true; Promise.resolve().then(render); }
  }

  function boot() {
    tpl = document.getElementById('dc-template');
    root = document.getElementById('dc-root');
    if (!tpl || !root || typeof window.Component !== 'function') return;
    var props = JSON.parse(root.getAttribute('data-props') || '{}');
    comp = new window.Component(props);
    if (!comp.state) comp.state = {};
    render();
    if (typeof comp.componentDidMount === 'function') comp.componentDidMount();
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
