import { h } from './dom';
import { icon } from './icons';

/** Navy header with a back arrow and a title. */
export function titleBar(title: string, onBack: () => void): HTMLElement {
  const back = h('button.bar-back', { type: 'button', 'aria-label': 'Back' }, icon('back', 24, 2));
  back.addEventListener('click', onBack);
  return h('header.bar', {}, h('div.bar-in', {}, back, h('h1.bar-title', {}, title)));
}
