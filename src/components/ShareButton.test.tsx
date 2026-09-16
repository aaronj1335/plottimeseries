import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShareButton, shareLabel } from './ShareButton.tsx';

describe('ShareButton', () => {
  it('offers to share before it has been clicked', () => {
    const markup = renderToStaticMarkup(<ShareButton onShare={() => Promise.resolve('copied')} />);

    assert.match(markup, /Share Link/);
    assert.match(markup, /class="share-button"/);
    assert.doesNotMatch(markup, /disabled/);
  });

  it('names every state it can land in, so none renders blank', () => {
    for (const status of ['idle', 'working', 'copied', 'address-bar', 'failed'] as const) {
      assert.ok(shareLabel(status).length > 0, `no label for ${status}`);
    }
  });
});
