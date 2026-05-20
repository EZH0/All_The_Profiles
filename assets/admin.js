const defaults = {
  site: {
    title: "WoW Addon Profile Vault",
    subtitle: "애드온 프로파일 문자열 공유 및 백업",
    downloadUrl: "",
    updatedAt: ""
  },
  profiles: []
};

const state = {
  data: structuredClone(defaults),
  sha: "",
  selectedId: ""
};

const fields = {
  owner: document.querySelector("#owner"),
  repo: document.querySelector("#repo"),
  branch: document.querySelector("#branch"),
  path: document.querySelector("#data-path"),
  token: document.querySelector("#token"),
  status: document.querySelector("#connection-status"),
  siteTitle: document.querySelector("#site-title-input"),
  siteSubtitle: document.querySelector("#site-subtitle-input"),
  downloadUrl: document.querySelector("#download-url-input"),
  id: document.querySelector("#profile-id"),
  addon: document.querySelector("#profile-addon"),
  name: document.querySelector("#profile-name"),
  version: document.querySelector("#profile-version"),
  description: document.querySelector("#profile-description"),
  tags: document.querySelector("#profile-tags"),
  body: document.querySelector("#profile-body"),
  count: document.querySelector("#profile-count"),
  list: document.querySelector("#admin-list")
};

restoreSettings();
bindEvents();
renderAll();

function bindEvents() {
  document.querySelector("#github-form").addEventListener("submit", (event) => {
    event.preventDefault();
    loadRemote();
  });

  document.querySelector("#load-local").addEventListener("click", loadLocal);
  document.querySelector("#save-remote").addEventListener("click", saveRemote);
  document.querySelector("#new-profile").addEventListener("click", clearProfileForm);
  document.querySelector("#delete-profile").addEventListener("click", deleteSelectedProfile);

  document.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertProfile();
  });

  fields.list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-edit]");
    if (item) editProfile(item.dataset.edit);
  });

  [fields.siteTitle, fields.siteSubtitle, fields.downloadUrl].forEach((input) => {
    input.addEventListener("input", syncSiteFields);
  });
}

function restoreSettings() {
  const saved = JSON.parse(localStorage.getItem("profileVaultSettings") || "{}");
  fields.owner.value = saved.owner || "";
  fields.repo.value = saved.repo || "";
  fields.branch.value = saved.branch || "main";
  fields.path.value = saved.path || "data/profiles.json";
  fields.token.value = sessionStorage.getItem("profileVaultToken") || "";
}

function saveSettings() {
  localStorage.setItem("profileVaultSettings", JSON.stringify({
    owner: fields.owner.value.trim(),
    repo: fields.repo.value.trim(),
    branch: fields.branch.value.trim(),
    path: fields.path.value.trim()
  }));
  sessionStorage.setItem("profileVaultToken", fields.token.value.trim());
}

async function loadLocal() {
  setStatus("로컬 JSON을 불러오는 중");
  const response = await fetch("data/profiles.json", { cache: "no-store" });
  state.data = await response.json();
  state.sha = "";
  setStatus("로컬 JSON 로드 완료");
  renderAll();
}

async function loadRemote() {
  saveSettings();
  setStatus("GitHub에서 불러오는 중");
  const response = await githubRequest("GET");
  state.sha = response.sha;
  state.data = JSON.parse(decodeBase64(response.content));
  setStatus("GitHub 연결 완료");
  renderAll();
}

async function saveRemote() {
  saveSettings();
  syncSiteFields();
  state.data.site.updatedAt = new Date().toISOString().slice(0, 10);
  setStatus("GitHub에 저장 중");

  const content = encodeBase64(JSON.stringify(state.data, null, 2) + "\n");
  const body = {
    message: `Update WoW addon profiles ${state.data.site.updatedAt}`,
    content,
    branch: fields.branch.value.trim()
  };

  if (state.sha) body.sha = state.sha;

  const response = await githubRequest("PUT", body);
  state.sha = response.content.sha;
  setStatus("저장 완료");
  renderAll();
}

async function githubRequest(method, body) {
  const owner = fields.owner.value.trim();
  const repo = fields.repo.value.trim();
  const path = fields.path.value.trim();
  const token = fields.token.value.trim();

  if (!owner || !repo || !path || !token) {
    throw new Error("GitHub 연결 정보를 모두 입력하세요.");
  }

  const branch = fields.branch.value.trim();
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(path)}`;
  const url = method === "GET" ? `${baseUrl}?ref=${encodeURIComponent(branch)}` : baseUrl;
  const response = await fetch(url, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub 요청 실패: ${response.status} ${detail}`);
  }

  return response.json();
}

function upsertProfile() {
  const profile = {
    id: slug(fields.id.value),
    addon: fields.addon.value.trim(),
    name: fields.name.value.trim(),
    description: fields.description.value.trim(),
    version: fields.version.value.trim(),
    tags: fields.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    body: fields.body.value
  };

  if (!profile.id || !profile.addon || !profile.name || !profile.body) {
    setStatus("ID, 애드온, 이름, 문자열은 필수입니다.");
    return;
  }

  const index = state.data.profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) {
    state.data.profiles[index] = profile;
  } else {
    state.data.profiles.push(profile);
  }

  state.selectedId = profile.id;
  setStatus("목록에 반영됨. GitHub 저장을 눌러 배포하세요.");
  renderAll();
}

function editProfile(id) {
  const profile = state.data.profiles.find((item) => item.id === id);
  if (!profile) return;
  state.selectedId = id;
  fields.id.value = profile.id;
  fields.addon.value = profile.addon || "";
  fields.name.value = profile.name || "";
  fields.version.value = profile.version || "";
  fields.description.value = profile.description || "";
  fields.tags.value = (profile.tags || []).join(", ");
  fields.body.value = profile.body || "";
}

function deleteSelectedProfile() {
  if (!state.selectedId) return;
  state.data.profiles = state.data.profiles.filter((profile) => profile.id !== state.selectedId);
  clearProfileForm();
  setStatus("삭제됨. GitHub 저장을 눌러 배포하세요.");
  renderAll();
}

function clearProfileForm() {
  state.selectedId = "";
  fields.id.value = "";
  fields.addon.value = "";
  fields.name.value = "";
  fields.version.value = "";
  fields.description.value = "";
  fields.tags.value = "";
  fields.body.value = "";
}

function syncSiteFields() {
  state.data.site = {
    ...state.data.site,
    title: fields.siteTitle.value.trim(),
    subtitle: fields.siteSubtitle.value.trim(),
    downloadUrl: fields.downloadUrl.value.trim()
  };
}

function renderAll() {
  state.data.site = { ...defaults.site, ...(state.data.site || {}) };
  state.data.profiles = Array.isArray(state.data.profiles) ? state.data.profiles : [];
  fields.siteTitle.value = state.data.site.title || "";
  fields.siteSubtitle.value = state.data.site.subtitle || "";
  fields.downloadUrl.value = state.data.site.downloadUrl || "";
  fields.count.textContent = `${state.data.profiles.length}개`;
  fields.list.innerHTML = state.data.profiles.map((profile) => `
    <button class="admin-item" type="button" data-edit="${escapeHtml(profile.id)}">
      <span>
        <strong>${escapeHtml(profile.name)}</strong>
        ${escapeHtml(profile.addon)} · ${escapeHtml(profile.id)}
      </span>
      <span>${escapeHtml(profile.version || "")}</span>
    </button>
  `).join("");
}

function setStatus(message) {
  fields.status.textContent = message;
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("unhandledrejection", (event) => {
  setStatus(event.reason?.message || "알 수 없는 오류");
});
