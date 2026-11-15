type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | null | undefined | false;

/** Tiny element helper: h('div.cls#id', { attr }, children...). Keys starting with "on" add listeners. */
type TagName<S extends string> = S extends `${infer T}.${string}`
  ? T extends `${infer U}#${string}`
    ? U
    : T
  : S extends `${infer T}#${string}`
    ? T
    : S;
type El<S extends string> = HTMLElementTagNameMap[TagName<S> & keyof HTMLElementTagNameMap];

export function h<S extends string>(
  tag: S,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): El<S> {
  const [name, ...tokens] = tag.split(/(?=[.#])/);
  const el = document.createElement(name) as El<S>;
  for (const t of tokens) {
    if (t[0] === '#') el.id = t.slice(1);
    else if (t.length > 1) el.classList.add(t.slice(1));
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += ` ${String(v)}`;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function option(value: string, label: string, opts: { disabled?: boolean } = {}): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  if (opts.disabled) o.disabled = true;
  return o;
}
