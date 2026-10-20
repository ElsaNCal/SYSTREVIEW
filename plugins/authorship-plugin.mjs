// authorship-plugin.mjs — MyST plugin: directive + transform
// Creates an anywidget node with author data baked in.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const authorshipDirective = {
  name: 'authorship-explorer',
  doc: 'Renders an interactive authorship contribution explorer widget.',
  options: {
    authors: {
      type: String,
      doc: 'Path to authors YAML file (default: ./authors.yml)',
    },
    'authors-alt': {
      type: String,
      doc: 'Path to alternate authors YAML file for toggle (e.g. ./authors-real.yml)',
    },
    'alt-label': {
      type: String,
      doc: 'Label for the alternate dataset (default: "Real contributors")',
    },
    'authors-alt2': {
      type: String,
      doc: 'Path to second alternate authors YAML file',
    },
    'alt2-label': {
      type: String,
      doc: 'Label for the second alternate dataset',
    },
    height: {
      type: String,
      doc: 'Widget height, e.g. "800px"',
    },
  },
  run(data) {
    return [
      {
        type: 'authorship-explorer',
        authorsPath: data.options?.authors || './authors.yml',
        authorsAltPath: data.options?.['authors-alt'] || null,
        altLabel: data.options?.['alt-label'] || 'Real contributors',
        authorsAlt2Path: data.options?.['authors-alt2'] || null,
        alt2Label: data.options?.['alt2-label'] || 'Large team',
        height: data.options?.height || '800px',
      },
    ];
  },
};

const authorshipTransform = {
  name: 'authorship-data-loader',
  stage: 'document',
  plugin: (opts, utils) => (tree, vfile) => {
    // Build section ID → heading text map from the document AST
    const sectionLabels = {};
    function collectHeadings(n) {
      if (!n) return;
      if (n.type === 'heading' && n.identifier) {
        const text = (n.children || [])
          .filter(c => c.type === 'text')
          .map(c => c.value)
          .join('');
        if (text) sectionLabels[n.identifier] = text;
      }
      if (n.children) for (const child of n.children) collectHeadings(child);
    }
    collectHeadings(tree);

    function transform(node) {
      if (!node) return;

      if (node.type === 'authorship-explorer') {
        const docDir = vfile?.path ? dirname(vfile.path) : process.cwd();
        const yamlPath = resolve(docDir, node.authorsPath || './authors.yml');

        try {
          const raw = readFileSync(yamlPath, 'utf-8');
          const { parse } = require('yaml');
          const fullData = parse(raw);

          // Helper: resolve affiliation ID strings to full objects
          function resolveAffiliations(data) {
            const contribs = data?.project?.contributors || data?.contributors || [];
            const affDefs = data?.project?.affiliations || data?.affiliations || [];
            const affMap = Object.fromEntries(affDefs.map(a => [a.id, a]));
            return contribs.map(c => {
              if (!c.affiliations) return c;
              return {
                ...c,
                affiliations: c.affiliations.map(aff =>
                  typeof aff === 'string' ? (affMap[aff] || { id: aff, name: aff }) : aff
                ),
              };
            });
          }

          const contributors = resolveAffiliations(fullData);

          // Load alternate authors if specified
          let altContributors = null;
          let altLabel = node.altLabel || 'Real contributors';
          if (node.authorsAltPath) {
            try {
              const altPath = resolve(docDir, node.authorsAltPath);
              const altRaw = readFileSync(altPath, 'utf-8');
              const altData = parse(altRaw);
              altContributors = resolveAffiliations(altData);
            } catch (altErr) {
              console.warn(`authorship-plugin: Alt authors error: ${altErr.message}`);
            }
          }

          // Load second alternate authors if specified
          let alt2Contributors = null;
          let alt2Label = node.alt2Label || 'Large team';
          if (node.authorsAlt2Path) {
            try {
              const alt2Path = resolve(docDir, node.authorsAlt2Path);
              const alt2Raw = readFileSync(alt2Path, 'utf-8');
              const alt2Data = parse(alt2Raw);
              alt2Contributors = resolveAffiliations(alt2Data);
            } catch (alt2Err) {
              console.warn(`authorship-plugin: Alt2 authors error: ${alt2Err.message}`);
            }
          }

          // Build the data envelope with primary + optional alt dataset
          const envelope = {
            primary: contributors,
            sourceFiles: [node.authorsPath || './authors.yml'],
          };
          if (altContributors) {
            envelope.alt = altContributors;
            envelope.altLabel = altLabel;
            if (node.authorsAltPath) envelope.sourceFiles.push(node.authorsAltPath);
          }
          if (alt2Contributors) {
            envelope.alt2 = alt2Contributors;
            envelope.alt2Label = alt2Label;
            if (node.authorsAlt2Path) envelope.sourceFiles.push(node.authorsAlt2Path);
          }

          // Convert to anywidget node
          node.type = 'anywidget';
          node.id = `authorship-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          node.esm = './authorship-widget.mjs';
          node.css = './authorship-widget.css';
          node.model = {
            authors: JSON.stringify(envelope),
            sectionLabels: JSON.stringify(sectionLabels),
            height: node.height || '800px',
          };
          delete node.authorsPath;
          delete node.authorsAltPath;
          delete node.altLabel;
          delete node.authorsAlt2Path;
          delete node.alt2Label;
          delete node.height;
        } catch (err) {
          console.warn(`authorship-plugin: Error: ${err.message}`);
          node.type = 'paragraph';
          node.children = [
            { type: 'text', value: `[Authorship Explorer: ${err.message}]` },
          ];
          delete node.authorsPath;
          delete node.height;
        }
      }

      if (node.children) {
        for (const child of node.children) {
          if (child) transform(child);
        }
      }
    }

    transform(tree);
  },
};

const plugin = {
  name: 'Authorship Explorer',
  directives: [authorshipDirective],
  transforms: [authorshipTransform],
};

export default plugin;
