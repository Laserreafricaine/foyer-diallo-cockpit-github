(function(){
  const A = window.App;

  const CLIENT_ID = '656731707257-mpfv0sc8vihenns72lm0u6k0jejse55m.apps.googleusercontent.com';
  const API_KEY   = ''; // pas nécessaire pour drive.file
  const SCOPES    = 'https://www.googleapis.com/auth/drive.file';
  const FILE_NAME = 'foyer-diallo-state.json';

  let gapiInited = false;
  let gisInited  = false;
  let tokenClient = null;
  let accessToken = null;
  let fileId = null;
  let saveTimer = null;

  // ─── CHARGEMENT GAPI + GIS ────────────────────────────────────
  function loadScripts() {
    const s1 = document.createElement('script');
    s1.src = 'https://apis.google.com/js/api.js';
    s1.onload = () => {
      gapi.load('client', async () => {
        await gapi.client.init({});
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        gapiInited = true;
        maybeConnect();
      });
    };
    document.head.appendChild(s1);

    const s2 = document.createElement('script');
    s2.src = 'https://accounts.google.com/gsi/client';
    s2.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp) => {
          if (resp.error) { A.driveSyncStatus('error'); return; }
          accessToken = resp.access_token;
          gapi.client.setToken({ access_token: accessToken });
          localStorage.setItem('fd_access_token', accessToken);
          A.driveSyncStatus('connected');
          await A.driveLoadState();
        }
      });
      gisInited = true;
      maybeConnect();
    };
    document.head.appendChild(s2);
  }

  function maybeConnect() {
    if (!gapiInited || !gisInited) return;
    // Réutiliser token existant
    const saved = localStorage.getItem('fd_access_token');
    if (saved) {
      accessToken = saved;
      gapi.client.setToken({ access_token: saved });
      A.driveSyncStatus('connected');
      A.driveLoadState();
    } else {
      A.driveSyncStatus('disconnected');
    }
  }

  // ─── CONNEXION ────────────────────────────────────────────────
  A.driveConnect = () => {
    if (!gisInited || !gapiInited) {
      const btn = document.getElementById('driveSyncBtn');
      if (btn) btn.textContent = '☁ Chargement…';
      // Réessayer toutes les 500ms pendant 10 secondes
      let tries = 0;
      const interval = setInterval(() => {
        tries++;
        if (gapiInited && gisInited) {
          clearInterval(interval);
          A.driveConnect();
        } else if (tries > 20) {
          clearInterval(interval);
          A.driveSyncStatus('disconnected');
          alert('Impossible de charger les scripts Google. Vérifiez votre connexion.');
        }
      }, 500);
      return;
    }
    if (accessToken) { A.driveLoadState(); return; }
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  A.driveDisconnect = () => {
    if (accessToken) google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null; fileId = null;
    localStorage.removeItem('fd_access_token');
    localStorage.removeItem('fd_file_id');
    gapi.client.setToken(null);
    A.driveSyncStatus('disconnected');
  };

  // ─── STATUS ───────────────────────────────────────────────────
  A.driveSyncStatus = (status) => {
    const btn = document.getElementById('driveSyncBtn');
    if (!btn) return;
    const styles = {
      connected:    ['☁ Drive ✓',       'linear-gradient(135deg,#138a5b,#0f6b46)', '0 8px 18px rgba(19,138,91,.25)'],
      saving:       ['☁ Sauvegarde…',   'linear-gradient(135deg,#c58a1e,#a07518)', 'none'],
      error:        ['☁ Erreur Drive',  'linear-gradient(135deg,#dc2626,#b91c1c)', 'none'],
      disconnected: ['☁ Connecter Drive','linear-gradient(135deg,#2457ff,#1a3fb5)','0 8px 18px rgba(36,87,255,.2)'],
    };
    const [text, bg, shadow] = styles[status] || styles.disconnected;
    btn.textContent = text;
    btn.style.background = bg;
    btn.style.boxShadow = shadow;
  };

  const FOLDER_NAME = 'Foyer Diallo';

  // ─── DOSSIER ──────────────────────────────────────────────────
  async function getOrCreateFolder() {
    let folderId = localStorage.getItem('fd_folder_id');
    if (folderId) return folderId;
    // Chercher le dossier
    const res = await gapi.client.drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      spaces: 'drive'
    });
    const folders = res.result.files;
    if (folders && folders.length > 0) {
      folderId = folders[0].id;
    } else {
      // Créer le dossier
      const create = await gapi.client.drive.files.create({
        resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
      });
      folderId = create.result.id;
    }
    localStorage.setItem('fd_folder_id', folderId);
    return folderId;
  }

  // ─── FICHIER ──────────────────────────────────────────────────
  async function getOrCreateFile() {
    if (fileId) return fileId;
    const saved = localStorage.getItem('fd_file_id');
    if (saved) { fileId = saved; return fileId; }
    try {
      const folderId = await getOrCreateFolder();
      const res = await gapi.client.drive.files.list({
        q: `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id,name)',
        spaces: 'drive'
      });
      const files = res.result.files;
      if (files && files.length > 0) {
        fileId = files[0].id;
        localStorage.setItem('fd_file_id', fileId);
        return fileId;
      }
      // Créer dans le dossier
      const create = await gapi.client.drive.files.create({
        resource: { name: FILE_NAME, mimeType: 'application/json', parents: [folderId] },
        fields: 'id'
      });
      fileId = create.result.id;
      localStorage.setItem('fd_file_id', fileId);
      return fileId;
    } catch(e) {
      if (e.status === 401) handleExpired();
      throw e;
    }
  }

  function handleExpired() {
    accessToken = null;
    localStorage.removeItem('fd_access_token');
    gapi.client.setToken(null);
    A.driveSyncStatus('disconnected');
  }

  // ─── SAUVEGARDER ─────────────────────────────────────────────
  A.driveSave = async () => {
    if (!accessToken) return;
    try {
      A.driveSyncStatus('saving');
      const fid = await getOrCreateFile();
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fid}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(A.state)
      });
      A.driveSyncStatus('connected');
    } catch(e) {
      console.error('Drive save error', e);
      A.driveSyncStatus('error');
      if (e.status === 401) handleExpired();
    }
  };

  A.driveSaveDebounced = () => {
    if (!accessToken) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => A.driveSave(), 2000);
  };

  // ─── CHARGER ──────────────────────────────────────────────────
  A.driveLoadState = async () => {
    if (!accessToken) return;
    try {
      const fid = await getOrCreateFile();
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fid}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!r.ok) { if (r.status === 401) handleExpired(); return; }
      const text = await r.text();
      if (!text || text.trim() === '') return;
      const data = JSON.parse(text);
      if (data && data.lines) {
        A.state = data;
        A.ensureSettings();
        A.save();
        A.render();
      }
    } catch(e) { console.warn('Drive load', e); }
  };

  // ─── EXPORT VERSIONNÉ ─────────────────────────────────────────
  A.driveExportVersion = async () => {
    if (!accessToken) { A.exportVersionned(); return; }
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const name = `foyer-diallo-${stamp}.json`;
    try {
      const boundary = 'fd_boundary';
      const meta = JSON.stringify({ name, mimeType: 'application/json' });
      const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(A.state)}\r\n--${boundary}--`;
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metaWithFolder}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(A.state)}\r\n--${boundary}--`
      });
      const btn = document.querySelector('[onclick="App.driveExportVersion()"]');
      if (btn) { const o = btn.textContent; btn.textContent = '✓ Sauvegardé dans Drive'; setTimeout(() => btn.textContent = o, 2000); }
    } catch(e) { A.exportVersionned(); }
  };

  // ─── PATCHER App.save ─────────────────────────────────────────
  const _orig = A.save;
  A.save = function() { _orig.call(this); A.driveSaveDebounced(); };

  // ─── INIT ─────────────────────────────────────────────────────
  // Charger immédiatement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadScripts);
  } else {
    loadScripts();
  }

})();
