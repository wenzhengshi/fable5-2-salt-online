(function (root) {
  'use strict';
  const colors = ['红色', '蓝色', '绿色', '金色', '白色', '黑色', '紫色', '银色',
    '橙色', '粉色', '青色', '灰色', '黄色', '褐色', '翠色', '橘红'];
  const objects = ['松树', '船帆', '狐狸', '风筝', '石桥', '海星', '铃铛', '灯笼',
    '竹伞', '茶杯', '月亮', '雪人', '玫瑰', '羽毛', '木马', '贝壳'];
  const vocabulary = colors.flatMap(color => objects.map(object => color + object));
  const indices = new Map(vocabulary.map((word, index) => [word, index]));
  const isCode = value => /^(?:[A-F0-9]{6}-){3}[A-F0-9]{6}$/.test(value);
  function wordsFor(code) {
    if (!isCode(code)) return '';
    return code.replace(/-/g, '').match(/../g).map(pair => vocabulary[Number.parseInt(pair, 16)]).join(' ');
  }
  function canonical(input) {
    if (typeof input !== 'string' || input.length > 120) return '';
    const raw = input.trim().toUpperCase();
    if (isCode(raw)) return raw;
    const parts = raw.split(/[\s，、,]+/u);
    if (parts.length !== 12 || parts.some(part => !indices.has(part))) return '';
    return parts.map(part => indices.get(part).toString(16).toUpperCase().padStart(2, '0'))
      .join('').match(/.{6}/g).join('-');
  }
  const api = { canonical, wordsFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaltContainerPassword = api;
})(globalThis);
