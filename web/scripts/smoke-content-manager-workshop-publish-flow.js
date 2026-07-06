#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const manager = fs.readFileSync(path.join(ROOT, 'tm-content-manager.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-content-manager-community.js'), 'utf8');
const client = fs.readFileSync(path.join(ROOT, 'tm-online-client.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'tm-online-mall.css'), 'utf8');
const verifyAll = fs.readFileSync(path.join(ROOT, 'scripts/verify-all.js'), 'utf8');

function functionBody(name, source) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' should exist');
  const next = source.indexOf('\n  function ', start + 10);
  return source.slice(start, next >= 0 ? next : source.length);
}

const studio = functionBody('renderStudioPane', manager);

assert(studio.includes('创作中心 · 发布申请'), 'studio should present a publish-application flow');
assert(studio.includes('tm-publish-package-file'), 'studio should require a package file picker');
assert(studio.includes('accept=".tm-pack,.zip'), 'package picker should accept .tm-pack and .zip');
assert(studio.includes('tm-publish-cover-file'), 'studio should include a cover image picker');
assert(studio.includes('tm-publish-gallery-files'), 'studio should include gallery image picker');
assert(studio.includes('TMContentManager.submitWorkshopPublication()'), 'studio should submit via the direct package publication flow');
assert(!studio.includes('tm-webpub-scn'), 'new studio flow should not publish by selecting a scenario-library entry');
assert(!studio.includes('tm-asset-files'), 'new studio flow should not build a zip from loose asset files');

[
  'function onPublishPackageFile(',
  'function onPublishCoverFile(',
  'function onPublishGalleryFiles(',
  'function submitWorkshopPublication(',
  'function resetPublicationDraft('
].forEach((needle) => assert(manager.includes(needle), 'missing publish helper: ' + needle));

[
  'onPublishPackageFile: onPublishPackageFile',
  'onPublishCoverFile: onPublishCoverFile',
  'onPublishGalleryFiles: onPublishGalleryFiles',
  'submitWorkshopPublication: submitWorkshopPublication',
  'resetPublicationDraft: resetPublicationDraft'
].forEach((needle) => assert(manager.includes(needle), 'missing public API: ' + needle));

[
  'packageKind',
  'releaseNotes',
  'coverImage',
  'galleryImages',
  'parentId'
].forEach((needle) => assert(client.includes(needle), 'uploadPack should forward store metadata: ' + needle));

[
  '.tm-mall .pub-flow',
  '.tm-mall .pub-grid.pub-grid-v2',
  '.tm-mall .pub-card',
  '.tm-mall .pub-cover',
  '.tm-mall .pub-gallery',
  '.tm-mall .pub-checks'
].forEach((needle) => assert(css.includes(needle), 'missing publish flow CSS: ' + needle));

const desktopGridAt = css.indexOf('.tm-mall .pub-grid.pub-grid-v2{grid-template-columns:minmax(250px,.82fr)');
assert(desktopGridAt >= 0, 'publish flow should define the desktop two-column grid');
assert(
  css.indexOf('.tm-mall .pub-grid.pub-grid-v2{grid-template-columns:1fr;}', desktopGridAt) > desktopGridAt,
  'publish flow mobile grid override should appear after the desktop grid rule'
);

assert(
  verifyAll.includes('smoke-content-manager-workshop-publish-flow.js'),
  'verify-all should include the workshop publish-flow smoke'
);

console.log('[smoke-content-manager-workshop-publish-flow] PASS');
