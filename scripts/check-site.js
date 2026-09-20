#!/usr/bin/env node
'use strict';

/**
 * Smoke check for this zero-build static site: index.html exists, every
 * relative asset path resolves on disk, same-page hashes have targets,
 * and CSS/JS still load as classic link/script tags (no Vite/Webpack).
 */
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

var failed = 0;
var passed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('ok  - ' + name);
  } catch (err) {
    failed += 1;
    console.log('fail - ' + name);
    console.log('     ' + (err && err.message ? err.message : err));
  }
}

function isRemote(url) {
  return /^(https?:)?\/\//i.test(url) || /^(mailto|tel|data|javascript):/i.test(url);
}

function isFragmentOnly(url) {
  return url.charAt(0) === '#';
}

function extractAttrUrls(html, attr) {
  var urls = [];
  var re = new RegExp('\\b' + attr + '\\s*=\\s*["\']([^"\']+)["\']', 'gi');
  var match;
  while ((match = re.exec(html))) {
    urls.push(match[1]);
  }
  return urls;
}

function extractCssUrls(css) {
  var urls = [];
  var re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  var match;
  while ((match = re.exec(css))) {
    var value = match[1].trim();
    if (value.indexOf('#') === 0) continue;
    urls.push(value);
  }
  return urls;
}

var pkg = JSON.parse(read('package.json'));
var index = read('index.html');

check('index.html exists at repo root', function () {
  assert.ok(exists('index.html'), 'index.html missing');
});

check('package.json is serve + check only (no bundler)', function () {
  assert.ok(/python3 -m http\.server/.test(pkg.scripts.dev), 'dev must be python static server');
  assert.ok(/python3 -m http\.server/.test(pkg.scripts.start), 'start must be python static server');
  assert.ok(pkg.scripts.check, 'missing check script');
  assert.ok(pkg.scripts.test, 'missing test script');
  assert.ok(!pkg.scripts.build, 'no build step — zero-build site');
  assert.ok(!pkg.scripts.preview, 'no vite preview');
  assert.ok(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'do not add runtime npm deps');
  assert.ok(!pkg.devDependencies || !pkg.devDependencies.vite, 'Vite skipped — would rewrite how HTML loads CSS/JS');
  assert.ok(!pkg.devDependencies || !pkg.devDependencies.webpack, 'Webpack skipped — zero-build site');
  assert.strictEqual(pkg.type, undefined, 'do not set type=module — check scripts use require()');
});

check('no framework rewrite; no Vite/Webpack config', function () {
  [
    'vite.config.js',
    'vite.config.mjs',
    'webpack.config.js',
    'next.config.js',
    'next.config.mjs',
    'astro.config.mjs',
    'remix.config.js',
    'firebase.json'
  ].forEach(function (file) {
    assert.ok(!exists(file), file + ' must not exist');
  });
});

check('key assets exist', function () {
  [
    'assets/css/styles.min.css',
    'assets/js/script.min.js',
    'assets/img/Brand.png'
  ].forEach(function (rel) {
    assert.ok(exists(rel), rel + ' missing');
  });
});

check('classic link/script tags load local CSS/JS (not modules)', function () {
  assert.ok(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']assets\/css\/styles\.min\.css["']/.test(index) ||
      /<link\b[^>]*href=["']assets\/css\/styles\.min\.css["'][^>]*rel=["']stylesheet["']/.test(index),
    'index.html must load assets/css/styles.min.css via <link rel="stylesheet">'
  );
  assert.ok(
    /<script\b[^>]*src=["']assets\/js\/script\.min\.js["'][^>]*>/.test(index),
    'index.html must load assets/js/script.min.js via <script src>'
  );

  var scriptRe = /<script\b([^>]*)>/gi;
  var match;
  while ((match = scriptRe.exec(index))) {
    var attrs = match[1];
    if (/type\s*=\s*["']application\/ld\+json["']/.test(attrs)) continue;
    if (/type\s*=\s*["']module["']/.test(attrs)) {
      throw new Error('found type=module script: ' + attrs.trim());
    }
  }
});

check('relative href/src paths in index.html resolve on disk', function () {
  var attrs = ['src', 'href'];
  var missing = [];
  attrs.forEach(function (attr) {
    extractAttrUrls(index, attr).forEach(function (url) {
      if (isRemote(url) || isFragmentOnly(url)) return;
      var file = url.split('?')[0].split('#')[0];
      if (!file) return;
      if (file.charAt(0) === '/') {
        file = file.slice(1);
      }
      if (!exists(file)) missing.push(attr + '=' + url);
    });
  });
  assert.strictEqual(missing.length, 0, 'broken relative paths: ' + missing.join(', '));
});

check('relative url() paths in local CSS resolve on disk', function () {
  var cssRel = 'assets/css/styles.min.css';
  var css = read(cssRel);
  var missing = [];
  extractCssUrls(css).forEach(function (url) {
    if (isRemote(url)) return;
    var file = url.split('?')[0].split('#')[0];
    if (!file) return;
    var resolved = file.charAt(0) === '/'
      ? file.slice(1)
      : path.posix.normalize(path.posix.join(path.posix.dirname(cssRel), file));
    if (!exists(resolved)) missing.push(url + ' (from ' + cssRel + ')');
  });
  assert.strictEqual(missing.length, 0, 'broken CSS urls: ' + missing.join(', '));
});

check('same-page hash links have matching id targets', function () {
  var missing = [];
  extractAttrUrls(index, 'href').forEach(function (url) {
    if (!isFragmentOnly(url) || url === '#') return;
    var id = url.slice(1);
    var hasId = new RegExp('\\sid=["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']').test(index);
    if (!hasId) missing.push(url);
  });
  assert.strictEqual(missing.length, 0, 'hash links with no id: ' + missing.join(', '));
});

console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
