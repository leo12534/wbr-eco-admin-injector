(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isDisabled = v => !!Number(v.disabled);

  async function waitFor(test, timeout = 8000, step = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = test();
      if (value) return value;
      await sleep(step);
    }
    return null;
  }

  function regionsVm() {
    const el = document.querySelector('.eco-regions');
    let vm = el && el.__vue__;
    for (let d = 0; d < 12 && vm && !Array.isArray(vm.$data?.regions); d++) vm = vm.$parent;
    return Array.isArray(vm?.$data?.regions) ? vm : null;
  }

  function active() {
    return !!document.querySelector('.eco-regions') || document.body.classList.contains('eco-v2');
  }

  function region(sectionName) {
    const vm = regionsVm();
    if (!vm) return { error: 'Open the page\'s Regions tab, wait for it to load, then try again.' };
    const target = String(sectionName || 'page_content').toLowerCase();
    const r = vm.$data.regions.find(x => String(x.path || '').toLowerCase() === target);
    if (!r) return { error: `This page has no "${sectionName}" region.` };
    return { vm, region: r };
  }

  function views(sectionName) {
    const found = region(sectionName);
    if (found.error) return found;
    return {
      views: (found.region.views || []).map(v => ({ id: v.id, name: v.name || v.file || '', html: v.html || '', disabled: isDisabled(v) }))
    };
  }

  function modalVm(vm) {
    return vm.$children.find(c => c.$options.name === 'ViewModal');
  }

  async function openModal(vm, open) {
    open();
    const modal = await waitFor(() => {
      const m = vm.$data.modal && modalVm(vm);
      return m && !m.loading && Array.isArray(m.options?.views) && m.options.views.length ? m : null;
    });
    if (!modal) { vm.$data.modal = false; return null; }
    await sleep(200);
    return modal;
  }

  async function submit(vm, modal) {
    modal.save();
    const done = await waitFor(() => !modal.saving && (!vm.$data.modal || modal.formError || Object.keys(modal.errors || {}).length), 15000);
    if (!done) return { success: false, error: 'Save timed out' };
    if (vm.$data.modal) {
      const msg = modal.formError || Object.values(modal.errors || {}).flat().join(' ') || 'Save failed';
      vm.$data.modal = false;
      return { success: false, error: msg };
    }
    return { success: true };
  }

  async function add(sectionName, name, html) {
    const found = region(sectionName);
    if (found.error) return { success: false, error: found.error };
    const { vm, region: r } = found;
    const modal = await openModal(vm, () => vm.openAdd(r));
    if (!modal) return { success: false, error: 'Add View dialog did not load' };
    modal.form.name = name;
    modal.form.file = 'html';
    modal.form.html = html;
    modal.form.disabled = 0;
    await sleep(150);
    return submit(vm, modal);
  }

  async function setDisabled(sectionName, index, disabled) {
    const found = region(sectionName);
    if (found.error) return { success: false, error: found.error };
    const { vm, region: r } = found;
    const view = r.views[index];
    if (!view) return { success: false, error: `No block at index ${index}` };
    const name = view.name || view.file || '';
    if (isDisabled(view) === disabled) return { success: true, name, skipped: true };
    const modal = await openModal(vm, () => vm.openEdit(r, view));
    if (!modal) return { success: false, error: 'Edit dialog did not load' };
    modal.form.disabled = disabled ? 1 : 0;
    await sleep(150);
    const result = await submit(vm, modal);
    return { ...result, name };
  }

  async function deleteFirstDisabled(sectionName) {
    const found = region(sectionName);
    if (found.error) return { success: false, error: found.error };
    const { vm, region: r } = found;
    const view = r.views.find(isDisabled);
    if (!view) return { success: false, error: 'No disabled blocks found' };
    const { id } = view;
    const name = view.name || view.file || '';
    const html = view.html || '';
    const regionsEl = document.querySelector('.eco-regions');
    const existing = new Set(document.querySelectorAll('button'));

    vm.remove(r, view);
    const confirmBtn = await waitFor(() => [...document.querySelectorAll('button')].find(b =>
      !existing.has(b) && !regionsEl.contains(b) && b.offsetParent && b.textContent.trim() === 'Delete'
    ), 3000);
    if (!confirmBtn) return { success: false, error: 'Delete confirmation did not appear' };
    confirmBtn.click();

    const gone = await waitFor(() => !r.views.some(v => v.id === id), 10000);
    if (!gone) return { success: false, error: 'Block was not removed' };
    return { success: true, name, html };
  }

  async function sortLiveFirst(sectionName) {
    const found = region(sectionName);
    if (found.error) return { success: false, error: found.error };
    const { vm, region: r } = found;
    const live = r.views.filter(v => !isDisabled(v));
    const off = r.views.filter(isDisabled);
    if (!live.length || !off.length) return { success: true };
    r.views.splice(0, r.views.length, ...live, ...off);
    vm.saveOrder(r);
    await sleep(1200);
    return { success: true };
  }

  function closeModal() {
    const vm = regionsVm();
    if (vm) vm.$data.modal = false;
  }

  window.ecoV2 = { active, views, add, setDisabled, deleteFirstDisabled, sortLiveFirst, closeModal };
})();
