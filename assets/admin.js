const defaults = {
  site: {
    title: "All The Profiles",
    subtitle: "WoW 애드온 프로파일 문자열 공유 및 백업",
    downloadUrl: "",
    updatedAt: ""
  },
  package: {
    name: "",
    versionDate: "",
    summary: "",
    requiredAddons: [],
    applyOrder: [],
    resources: []
  },
  profiles: []
};

const state = {
  data: structuredClone(defaults),
  indexSha: "",
  bodyCache: new Map(),
  fileShas: new Map(),
  selectedId: ""
};

const fields = {
  owner: document.querySelector("#owner"),
  repo: document.querySelector("#repo"),
  branch: document.querySelector("#branch"),
  path: document.querySelector("#data-path"),
  token: document.querySelector("#token"),
  status: document.querySelector("#connection-status"),
  bundleStatus: document.querySelector("#bundle-status"),
  bundleInput: document.querySelector("#bundle-input"),
  fileImport: document.querySelector("#file-import"),
  siteTitle: document.querySelector("#site-title-input"),
  siteSubtitle: document.querySelector("#site-subtitle-input"),
  downloadUrl: document.querySelector("#download-url-input"),
  id: document.querySelector("#profile-id"),
  addon: document.querySelector("#profile-addon"),
  name: document.querySelector("#profile-name"),
  version: document.querySelector("#profile-version"),
  format: document.querySelector("#profile-format"),
  profilePath: document.querySelector("#profile-path"),
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
    loadRemote().catch(showError);
  });

  document.querySelector("#load-local").addEventListener("click", () => loadLocal().catch(showError));
  document.querySelector("#save-remote").addEventListener("click", () => saveRemote().catch(showError));
  document.querySelector("#new-profile").addEventListener("click", clearProfileForm);
  document.querySelector("#delete-profile").addEventListener("click", deleteSelectedProfile);
  document.querySelector("#import-bundle").addEventListener("click", () => {
    try {
      importBundle();
    } catch (error) {
      showError(error);
    }
  });
  fields.fileImport.addEventListener("change", (event) => importFiles(event).catch(showError));

  document.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    upsertProfile();
  });

  fields.list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-edit]");
    if (item) editProfile(item.dataset.edit).catch(showError);
  });

  [fields.siteTitle, fields.siteSubtitle, fields.downloadUrl].forEach((input) => {
    input.addEventListener("input", syncSiteFields);
  });
}

function restoreSettings() {
  const saved = JSON.parse(localStorage.getItem("profileVaultSettings") || "{}");
  fields.owner.value = saved.owner || "EZH0";
  fields.repo.value = saved.repo || "All_The_Profiles";
  fields.branch.value = saved.branch || "main";
  fields.path.value = saved.path || "data/index.json";
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
  setStatus("로컬 index를 불러오는 중");
  const response = await fetch("data/index.json", { cache: "no-store" });
  state.data = await response.json();
  state.indexSha = "";
  state.bodyCache.clear();
  state.fileShas.clear();
  setStatus("로컬 index 로드 완료");
  renderAll();
}

async function loadRemote() {
  saveSettings();
  setStatus("GitHub에서 index를 불러오는 중");
  const response = await githubGet(fields.path.value.trim());
  state.indexSha = response.sha;
  state.data = JSON.parse(decodeBase64(response.content));
  state.bodyCache.clear();
  state.fileShas.clear();
  setStatus("GitHub index 로드 완료");
  renderAll();
}

async function saveRemote() {
  saveSettings();
  syncSiteFields();
  normalizeData();
  state.data.site.updatedAt = new Date().toISOString().slice(0, 10);

  setStatus("프로파일 TXT 파일 저장 중");
  for (const profile of state.data.profiles) {
    const body = state.bodyCache.get(profile.id);
    if (body === undefined) continue;
    await putGithubFile(profile.path, body, state.fileShas.get(profile.path));
  }

  setStatus("index JSON 저장 중");
  const indexData = {
    site: state.data.site,
    package: state.data.package,
    profiles: state.data.profiles.map(({ body, ...profile }) => profile)
  };

  const response = await putGithubFile(
    fields.path.value.trim(),
    JSON.stringify(indexData, null, 2) + "\n",
    state.indexSha
  );

  state.indexSha = response.content.sha;
  state.data = indexData;
  setStatus("저장 완료");
  renderAll();
}

async function loadBody(profile) {
  if (state.bodyCache.has(profile.id)) {
    return state.bodyCache.get(profile.id);
  }

  if (profile.body) {
    state.bodyCache.set(profile.id, profile.body);
    return profile.body;
  }

  if (!profile.path) return "";

  setStatus(`${profile.path} 불러오는 중`);
  const response = await githubGet(profile.path);
  const body = decodeBase64(response.content);
  state.fileShas.set(profile.path, response.sha);
  state.bodyCache.set(profile.id, body);
  setStatus("프로파일 본문 로드 완료");
  return body;
}

async function githubGet(path) {
  return githubRequest(path, "GET");
}

async function putGithubFile(path, content, sha) {
  const body = {
    message: `Update ${path}`,
    content: encodeBase64(content),
    branch: fields.branch.value.trim()
  };
  if (sha) body.sha = sha;

  try {
    const response = await githubRequest(path, "PUT", body);
    if (response.content?.sha) {
      if (path === fields.path.value.trim()) state.indexSha = response.content.sha;
      else state.fileShas.set(path, response.content.sha);
    }
    return response;
  } catch (error) {
    if (String(error.message).includes("404") && sha) {
      return putGithubFile(path, content, "");
    }
    if (String(error.message).includes("422") && !sha) {
      const existing = await githubGet(path);
      const retrySha = existing.sha;
      return putGithubFile(path, content, retrySha);
    }
    throw error;
  }
}

async function githubRequest(path, method, body) {
  const owner = fields.owner.value.trim();
  const repo = fields.repo.value.trim();
  const branch = fields.branch.value.trim();
  const token = fields.token.value.trim();

  if (!owner || !repo || !path || !token) {
    throw new Error("GitHub 연결 정보를 모두 입력하세요.");
  }

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
  const id = slug(fields.id.value || `${fields.addon.value}-${fields.name.value}`);
  const addon = fields.addon.value.trim();
  const name = fields.name.value.trim();
  const format = fields.format.value.trim() || slug(addon);
  const path = fields.profilePath.value.trim() || makeProfilePath(addon, name, id);
  const body = fields.body.value;

  if (!id || !addon || !name || !body) {
    setStatus("ID, 애드온, 이름, 문자열은 필수입니다.");
    return;
  }

  const profile = {
    id,
    addon,
    name,
    description: fields.description.value.trim(),
    version: fields.version.value.trim(),
    tags: fields.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    format,
    source: "manual",
    path
  };

  writeProfile(profile, body);
  state.selectedId = profile.id;
  setStatus("목록에 반영됨. GitHub 저장을 눌러 배포하세요.");
  renderAll();
}

function writeProfile(profile, body) {
  normalizeData();
  const index = state.data.profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) state.data.profiles[index] = profile;
  else state.data.profiles.push(profile);
  state.bodyCache.set(profile.id, body);
}

async function editProfile(id) {
  const profile = state.data.profiles.find((item) => item.id === id);
  if (!profile) return;
  state.selectedId = id;
  fields.id.value = profile.id;
  fields.addon.value = profile.addon || "";
  fields.name.value = profile.name || "";
  fields.version.value = profile.version || "";
  fields.format.value = profile.format || "";
  fields.profilePath.value = profile.path || "";
  fields.description.value = profile.description || "";
  fields.tags.value = (profile.tags || []).join(", ");
  fields.body.value = await loadBody(profile);
}

function deleteSelectedProfile() {
  if (!state.selectedId) return;
  state.data.profiles = state.data.profiles.filter((profile) => profile.id !== state.selectedId);
  state.bodyCache.delete(state.selectedId);
  clearProfileForm();
  setStatus("목록에서 삭제됨. GitHub 저장 시 index에서 빠집니다.");
  renderAll();
}

function clearProfileForm() {
  state.selectedId = "";
  fields.id.value = "";
  fields.addon.value = "";
  fields.name.value = "";
  fields.version.value = "";
  fields.format.value = "";
  fields.profilePath.value = "";
  fields.description.value = "";
  fields.tags.value = "";
  fields.body.value = "";
}

function importBundle() {
  const entries = parseBundle(fields.bundleInput.value);
  entries.forEach((entry) => writeProfile(entry.profile, entry.body));
  fields.bundleStatus.textContent = `${entries.length}개 항목 반영`;
  setStatus("통합 문자열 반영 완료. GitHub 저장을 눌러 배포하세요.");
  renderAll();
}

async function importFiles(event) {
  const files = [...event.target.files];
  let count = 0;
  for (const file of files) {
    const body = await file.text();
    const guessed = inferFromFileName(file.name);
    const profile = {
      id: guessed.id,
      addon: guessed.addon,
      name: guessed.name,
      description: "",
      version: "",
      tags: [guessed.format].filter(Boolean),
      format: guessed.format,
      source: "file-import",
      path: makeProfilePath(guessed.addon, guessed.name, guessed.id)
    };
    writeProfile(profile, body);
    count += 1;
  }
  fields.bundleStatus.textContent = `${count}개 파일 반영`;
  setStatus("파일 가져오기 완료. 필요한 이름/태그를 다듬은 뒤 저장하세요.");
  renderAll();
}

function parseBundle(text) {
  const blockPattern = /===== WOW_PROFILE_VAULT BEGIN =====\s*([\s\S]*?)===== CONTENT =====\s*([\s\S]*?)===== WOW_PROFILE_VAULT END =====/g;
  const entries = [];
  let match;

  while ((match = blockPattern.exec(text)) !== null) {
    const meta = parseHeaders(match[1]);
    const body = match[2].trim();
    const addon = meta.addon || "Unknown";
    const name = meta.name || `${addon} Profile`;
    const id = slug(meta.id || `${addon}-${name}`);
    const profile = {
      id,
      addon,
      name,
      description: meta.description || "",
      version: meta.version || "",
      tags: splitTags(meta.tags),
      format: meta.format || slug(addon),
      source: meta.source || "bundle",
      path: meta.path || makeProfilePath(addon, name, id)
    };
    entries.push({ profile, body });
  }

  if (entries.length === 0) {
    throw new Error("가져올 수 있는 WOW_PROFILE_VAULT 블록이 없습니다.");
  }

  return entries;
}

function parseHeaders(text) {
  return text.split(/\r?\n/).reduce((headers, line) => {
    const separator = line.indexOf(":");
    if (separator < 0) return headers;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers[key] = value;
    return headers;
  }, {});
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function inferFromFileName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const parts = base.split(/[-_\s]+/).filter(Boolean);
  const addon = parts[0] || "Unknown";
  const name = parts.slice(1).join(" ") || base;
  return {
    id: slug(base),
    addon,
    name,
    format: slug(addon)
  };
}

function makeProfilePath(addon, name, id) {
  const folder = slug(addon || "unknown") || "unknown";
  const file = slug(name || id || "profile") || "profile";
  return `profiles/${folder}/${file}.txt`;
}

function syncSiteFields() {
  state.data.site = {
    ...state.data.site,
    title: fields.siteTitle.value.trim(),
    subtitle: fields.siteSubtitle.value.trim(),
    downloadUrl: fields.downloadUrl.value.trim()
  };
}

function normalizeData() {
  state.data.site = { ...defaults.site, ...(state.data.site || {}) };
  state.data.package = { ...defaults.package, ...(state.data.package || {}) };
  state.data.profiles = Array.isArray(state.data.profiles) ? state.data.profiles : [];
}

function renderAll() {
  normalizeData();
  fields.siteTitle.value = state.data.site.title || "";
  fields.siteSubtitle.value = state.data.site.subtitle || "";
  fields.downloadUrl.value = state.data.site.downloadUrl || "";
  fields.count.textContent = `${state.data.profiles.length}개`;
  fields.list.innerHTML = state.data.profiles.map((profile) => `
    <button class="admin-item" type="button" data-edit="${escapeHtml(profile.id)}">
      <span>
        <strong>${escapeHtml(profile.name)}</strong>
        ${escapeHtml(profile.addon)} · ${escapeHtml(profile.id)}
        <small>${escapeHtml(profile.path || "")}</small>
      </span>
      <span>${escapeHtml(profile.version || profile.format || "")}</span>
    </button>
  `).join("");
}

function setStatus(message) {
  fields.status.textContent = message;
}

function showError(error) {
  setStatus(error.message || "알 수 없는 오류");
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
  showError(event.reason);
});
