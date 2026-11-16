(() => {
  'use strict';

  const form = document.getElementById('qr-form');
  if (!form) return;
  const input = document.getElementById('qr-image');
  const preview = document.getElementById('qr-preview');
  const feedback = document.getElementById('qr-feedback');
  const submit = document.getElementById('qr-submit');
  const originalPreview = preview && preview.src;
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const maxBytes = 4 * 1024 * 1024;
  let objectUrl = null;

  function setFeedback(message) {
    if (feedback) feedback.textContent = message || '';
    if (input) input.classList.toggle('invalid', !!message);
  }

  function clearPreview() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    if (preview && originalPreview) preview.src = originalPreview;
  }

  if (input) {
    input.addEventListener('change', () => {
      clearPreview();
      setFeedback('');
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > maxBytes) {
        input.value = '';
        setFeedback(form.dataset.tooLarge);
        return;
      }
      if (file.type && allowed.indexOf(file.type) === -1) {
        input.value = '';
        setFeedback(form.dataset.invalidType);
        return;
      }
      if (preview && window.URL && URL.createObjectURL) {
        objectUrl = URL.createObjectURL(file);
        preview.src = objectUrl;
      }
    });
  }

  form.addEventListener('submit', () => {
    if (!submit || submit.disabled) return;
    submit.disabled = true;
    if (submit.dataset.uploading) submit.textContent = submit.dataset.uploading;
  });

  window.addEventListener('beforeunload', clearPreview);
})();
