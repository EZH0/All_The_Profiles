const state = {
  profiles: [],
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

async function loadData() {
  const response = await fetch("data/profiles.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("프로파일 데이터를 불러오지 못했습니다.");
  }
  return response.json();
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
        <button class="button primary" data-copy="${escapeHtml(profile.id)}" type="button">복사</button>
      </header>
      <p>${escapeHtml(profile.description || "")}</p>
      ${profile.version ? `<p>${escapeHtml(profile.version)}</p>` : ""}
      <div class="tags">${(profile.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <pre class="profile-body">${escapeHtml(profile.body)}</pre>
    </article>
  `).join("");
}

async function copyProfile(id, button) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) return;
  await navigator.clipboard.writeText(profile.body);
  const original = button.textContent;
  button.textContent = "복사됨";
  setTimeout(() => {
    button.textContent = original;
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
  const button = event.target.closest("[data-copy]");
  if (button) {
    copyProfile(button.dataset.copy, button);
  }
});

loadData()
  .then((data) => {
    nodes.title.textContent = data.site?.title || "WoW Addon Profile Vault";
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
  .catch((error) => {
    nodes.empty.textContent = error.message;
    nodes.empty.classList.remove("hidden");
  });
