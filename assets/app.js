const state = {
  profiles: [],
  bodyCache: new Map(),
  query: "",
  addon: ""
};

const nodes = {
  title: document.querySelector("#site-title"),
  subtitle: document.querySelector("#site-subtitle"),
  download: document.querySelector("#download-link"),
  updatedAt: document.querySelector("#updated-at"),
  search: document.querySelector("#search-input"),
  addonFilter: document.querySelector("#addon-filter"),
  list: document.querySelector("#profile-list"),
  empty: document.querySelector("#empty-state")
};

async function loadIndex() {
  const response = await fetch("data/index.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("프로파일 목록을 불러오지 못했습니다.");
  }
  return response.json();
}

async function loadProfileBody(profile) {
  if (state.bodyCache.has(profile.id)) {
    return state.bodyCache.get(profile.id);
  }

  if (profile.body) {
    state.bodyCache.set(profile.id, profile.body);
    return profile.body;
  }

  if (!profile.path) {
    throw new Error("프로파일 파일 경로가 없습니다.");
  }

  const response = await fetch(profile.path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${profile.path} 파일을 불러오지 못했습니다.`);
  }

  const body = await response.text();
  state.bodyCache.set(profile.id, body);
  return body;
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function matches(profile) {
  const haystack = [
    profile.addon,
    profile.name,
    profile.description,
    profile.version,
    profile.format,
    profile.path,
    ...(profile.tags || [])
  ].map(normalize).join(" ");

  const queryOk = !state.query || haystack.includes(normalize(state.query));
  const addonOk = !state.addon || profile.addon === state.addon;
  return queryOk && addonOk;
}

function renderFilters() {
  const addons = [...new Set(state.profiles.map((profile) => profile.addon).filter(Boolean))].sort();
  nodes.addonFilter.innerHTML = '<option value="">전체</option>' + addons
    .map((addon) => `<option value="${escapeHtml(addon)}">${escapeHtml(addon)}</option>`)
    .join("");
}

function renderProfiles() {
  const profiles = state.profiles.filter(matches);
  nodes.empty.classList.toggle("hidden", profiles.length > 0);
  nodes.list.innerHTML = profiles.map((profile) => `
    <article class="profile-card">
      <header>
        <div>
          <div class="addon">${escapeHtml(profile.addon)}</div>
          <h3>${escapeHtml(profile.name)}</h3>
        </div>
      </header>
      <p>${escapeHtml(profile.description || "")}</p>
      ${profile.version ? `<p>${escapeHtml(profile.version)}</p>` : ""}
      <div class="tags">${(profile.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="profile-meta">${escapeHtml(profile.path || "내장 문자열")}</div>
      <div class="actions compact-actions">
        <button class="button primary" data-copy="${escapeHtml(profile.id)}" type="button">복사</button>
        <button class="button" data-download="${escapeHtml(profile.id)}" type="button">TXT</button>
        <button class="button" data-preview="${escapeHtml(profile.id)}" type="button">미리보기</button>
      </div>
      <pre class="profile-body hidden" id="preview-${escapeHtml(profile.id)}"></pre>
    </article>
  `).join("");
}

async function copyProfile(id, button) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) return;

  setBusy(button, "복사 중");
  const body = await loadProfileBody(profile);
  await navigator.clipboard.writeText(body);
  flashButton(button, "복사됨");
}

async function downloadProfile(id) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) return;

  const body = await loadProfileBody(profile);
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${profile.id || "profile"}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function togglePreview(id, button) {
  const profile = state.profiles.find((item) => item.id === id);
  const preview = document.querySelector(`#preview-${CSS.escape(id)}`);
  if (!profile || !preview) return;

  if (!preview.classList.contains("hidden")) {
    preview.classList.add("hidden");
    button.textContent = "미리보기";
    return;
  }

  setBusy(button, "로딩");
  const body = await loadProfileBody(profile);
  preview.textContent = body;
  preview.classList.remove("hidden");
  button.textContent = "접기";
  button.disabled = false;
}

function setBusy(button, label) {
  button.disabled = true;
  button.dataset.originalText = button.dataset.originalText || button.textContent;
  button.textContent = label;
}

function flashButton(button, label) {
  const original = button.dataset.originalText || button.textContent;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1200);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

nodes.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProfiles();
});

nodes.addonFilter.addEventListener("change", (event) => {
  state.addon = event.target.value;
  renderProfiles();
});

nodes.list.addEventListener("click", (event) => {
  const copy = event.target.closest("[data-copy]");
  const download = event.target.closest("[data-download]");
  const preview = event.target.closest("[data-preview]");

  if (copy) copyProfile(copy.dataset.copy, copy).catch(showError);
  if (download) downloadProfile(download.dataset.download).catch(showError);
  if (preview) togglePreview(preview.dataset.preview, preview).catch(showError);
});

function showError(error) {
  nodes.empty.textContent = error.message;
  nodes.empty.classList.remove("hidden");
}

loadIndex()
  .then((data) => {
    nodes.title.textContent = data.site?.title || "All The Profiles";
    nodes.subtitle.textContent = data.site?.subtitle || "";
    nodes.updatedAt.textContent = data.site?.updatedAt ? `Updated ${data.site.updatedAt}` : "";
    if (data.site?.downloadUrl) {
      nodes.download.href = data.site.downloadUrl;
      nodes.download.classList.remove("hidden");
    }
    state.profiles = Array.isArray(data.profiles) ? data.profiles : [];
    renderFilters();
    renderProfiles();
  })
  .catch(showError);
