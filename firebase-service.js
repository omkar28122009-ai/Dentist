/* Aurelle Dental Firebase adapter — Realtime Database + Authentication.
 * No localStorage/sessionStorage is used. Public content is isolated from private records.
 */
(function () {
  'use strict';
  const ROOT = 'clinic';
  let app = null, auth = null, db = null, currentUser = null, admin = false;
  let statusHandler = () => {}, authHandler = () => {}, initialised = false, cloudState = 'connecting';
  const listeners = [];
  const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
  const safeKey = v => String(v || '').replace(/[.#$\[\]/]/g, '-');
  const mapFromArray = (arr, fallbackKey = 'id') => Object.fromEntries((Array.isArray(arr) ? arr : []).filter(Boolean).map((x, i) => [safeKey(x[fallbackKey] || x.reference || x.slug || `item-${i}`), x]));
  const listFromMap = value => Array.isArray(value) ? value : (isObject(value) ? Object.values(value).filter(Boolean) : []);
  const cleanUser = user => user ? ({ uid: user.uid, email: user.email || '', displayName: user.displayName || '', isAnonymous: !!user.isAnonymous }) : null;

  function setStatus(state, message) {
    cloudState = state;
    statusHandler({ state, message: message || state, user: cleanUser(currentUser), isAdmin: admin });
  }
  function isAdmin() { return !!admin; }
  function getUser() { return currentUser; }
  function getStatus() { return cloudState; }
  function database() { if (!db) throw new Error('Firebase has not initialized.'); return db; }
  function checkConfigured() {
    const c = window.AURELLE_FIREBASE_CONFIG;
    if (!window.firebase || !c || !c.apiKey || !c.databaseURL || !c.projectId) throw new Error('Firebase configuration or SDK is unavailable. Check the Firebase SDK script tags and firebase-config.js.');
  }
  async function readAdminRole(user) {
    if (!user || user.isAnonymous) return false;
    try {
      const snapshot = await database().ref(`${ROOT}/roles/${user.uid}`).once('value');
      const role = snapshot.val() || {};
      return role.admin === true || role.role === 'admin' || role.role === 'owner';
    } catch (_) { return false; }
  }
  async function init(options = {}) {
    statusHandler = typeof options.onStatus === 'function' ? options.onStatus : statusHandler;
    authHandler = typeof options.onAuthChanged === 'function' ? options.onAuthChanged : authHandler;
    checkConfigured();
    if (!firebase.apps.length) app = firebase.initializeApp(window.AURELLE_FIREBASE_CONFIG);
    else app = firebase.app();
    auth = firebase.auth();
    db = firebase.database();
    try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (_) { /* Browser/privacy mode may limit persistence. */ }
    await new Promise((resolve, reject) => {
      let first = true;
      const unsubscribe = auth.onAuthStateChanged(async user => {
        currentUser = user || null;
        admin = await readAdminRole(currentUser);
        if (first) {
          first = false;
          initialised = true;
          setStatus('connected', 'Firebase connected');
          resolve();
          return;
        }
        setStatus('connected', admin ? 'Firebase connected · Staff access' : 'Firebase connected');
        try { authHandler({ user: cleanUser(currentUser), isAdmin: admin }); } catch (_) {}
      }, error => {
        if (first) { first = false; reject(error); }
        setStatus('error', error?.message || 'Firebase authentication error');
      });
      listeners.push(unsubscribe);
      setTimeout(() => { if (first) { first = false; resolve(); } }, 9000);
    });
    try {
      const connectedRef = db.ref('.info/connected');
      const onConnection = snapshot => {
        const connected = snapshot.val() === true;
        if (connected) setStatus('connected', admin ? 'Firebase connected · Staff access' : 'Firebase connected');
        else setStatus('offline', 'Firebase connection lost · Changes may not sync');
      };
      connectedRef.on('value', onConnection);
      listeners.push(() => connectedRef.off('value', onConnection));
    } catch (_) {}
    return { user: cleanUser(currentUser), isAdmin: admin, state: cloudState };
  }

  function subscribe(path, callback, onError) {
    const ref = database().ref(path);
    const handler = snapshot => { try { callback(snapshot.val()); } catch (error) { console.error(error); } };
    const fail = error => { setStatus('error', error?.message || 'Firebase read failed'); if (onError) onError(error); };
    ref.on('value', handler, fail);
    const stop = () => ref.off('value', handler);
    listeners.push(stop);
    return stop;
  }
  function watchPublic(callback, onError) { return subscribe(`${ROOT}/publicData`, callback, onError); }
  function watchSlotLocks(callback, onError) { return subscribe(`${ROOT}/slotLocks`, callback, onError); }
  function watchAdminCollections(callback, onError) {
    if (!admin) throw new Error('Staff authorization is required.');
    const stops = [];
    stops.push(subscribe(`${ROOT}/appointmentQueue`, v => callback('appointments', listFromMap(v).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')))), onError));
    stops.push(subscribe(`${ROOT}/enquiries`, v => callback('enquiries', listFromMap(v).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')))), onError));
    return () => stops.forEach(stop => stop());
  }

  async function loadPublicData() {
    const snap = await database().ref(`${ROOT}/publicData`).once('value');
    return snap.val() || null;
  }
  async function loadAdminWorkspace() {
    if (!admin) throw new Error('Your account does not have clinic administrator permissions.');
    const [workspaceSnap, apptSnap, enquirySnap] = await Promise.all([
      database().ref(`${ROOT}/adminWorkspace`).once('value'),
      database().ref(`${ROOT}/appointmentQueue`).once('value'),
      database().ref(`${ROOT}/enquiries`).once('value')
    ]);
    const workspace = workspaceSnap.val() || null;
    return {
      workspace,
      appointments: listFromMap(apptSnap.val()).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))),
      enquiries: listFromMap(enquirySnap.val()).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')))
    };
  }

  function publicPayload(data) {
    const published = key => (Array.isArray(data[key]) ? data[key] : []).filter(x => x && x.published && (key !== 'testimonials' || (x.approved && x.text)) && (key !== 'gallery' || x.consent) && (key !== 'articles' || x.reviewed));
    return {
      settings: {
        brand: data.settings?.brand || 'Aurelle Dental',
        tagline: data.settings?.tagline || '',
        phone: data.settings?.phone || '', email: data.settings?.email || '', address: data.settings?.address || '',
        directionsUrl: data.settings?.directionsUrl || '', openingHours: data.settings?.openingHours || '',
        publicNotice: data.settings?.publicNotice || '', appointmentDuration: Number(data.settings?.appointmentDuration || 30)
      },
      schedule: { days: data.schedule?.days || [1,2,3,4,5,6], start: data.schedule?.start || '10:00', end: data.schedule?.end || '17:00', interval: Number(data.schedule?.interval || 30), blockedDates: data.schedule?.blockedDates || [] },
      treatments: mapFromArray(published('treatments')),
      dentists: mapFromArray(published('dentists')),
      faqs: mapFromArray((data.faqs || []).filter(x => x && x.published !== false)),
      testimonials: mapFromArray(published('testimonials')),
      gallery: mapFromArray(published('gallery')),
      articles: mapFromArray(published('articles')),
      announcements: mapFromArray((data.announcements || []).filter(x => x && x.published)),
      updatedAt: new Date().toISOString()
    };
  }
  function adminPayload(data) {
    return {
      settings: data.settings || {}, schedule: data.schedule || {},
      treatments: mapFromArray(data.treatments), dentists: mapFromArray(data.dentists),
      faqs: mapFromArray(data.faqs), testimonials: mapFromArray(data.testimonials),
      gallery: mapFromArray(data.gallery), articles: mapFromArray(data.articles),
      announcements: mapFromArray(data.announcements), activity: mapFromArray(data.activity),
      schemaVersion: 2, updatedAt: new Date().toISOString()
    };
  }
  async function saveAdminWorkspace(data) {
    if (!admin) throw new Error('Only a verified clinic administrator can save website content.');
    setStatus('syncing', 'Saving approved content to Firebase…');
    const updates = {};
    updates[`${ROOT}/adminWorkspace`] = adminPayload(data);
    updates[`${ROOT}/publicData`] = publicPayload(data);
    await database().ref().update(updates);
    setStatus('connected', 'Content saved to Firebase');
    return true;
  }

  function buildOperationalUpdates(data) {
    const queue = mapFromArray((data.appointments || []).map(a => ({ ...a, reference: a.reference || a.id })), 'reference');
    const enquiries = mapFromArray(data.enquiries || []);
    const users = {};
    for (const a of Object.values(queue)) {
      if (a.uid) {
        users[a.uid] ||= {};
        users[a.uid][safeKey(a.reference || a.id)] = a;
      }
    }
    return { queue, enquiries, users };
  }

  // Used only by an administrator who explicitly imports a complete workspace backup.
  async function replaceWorkspace(data) {
    if (!admin) throw new Error('Only a verified clinic administrator can replace workspace data.');
    setStatus('syncing', 'Importing the selected workspace into Firebase…');
    const { queue, enquiries, users } = buildOperationalUpdates(data);
    const updates = {
      [`${ROOT}/adminWorkspace`]: adminPayload(data),
      [`${ROOT}/publicData`]: publicPayload(data),
      [`${ROOT}/appointmentQueue`]: queue,
      [`${ROOT}/enquiries`]: enquiries,
      [`${ROOT}/userAppointments`]: users
    };
    await database().ref().update(updates);
    setStatus('connected', 'Imported workspace saved to Firebase');
    return true;
  }

  async function updateAppointmentStatus(record) {
    if (!admin) throw new Error('Staff authorization is required to change appointment status.');
    if (!record || !record.reference) throw new Error('Appointment reference is missing.');
    const reference = safeKey(record.reference);
    const saved = { ...record, reference, id: reference, updatedAt: new Date().toISOString() };
    const updates = { [`${ROOT}/appointmentQueue/${reference}`]: saved };
    if (saved.uid) updates[`${ROOT}/userAppointments/${safeKey(saved.uid)}/${reference}`] = saved;
    if (['Cancelled', 'Declined'].includes(saved.status) && saved.date && saved.time) {
      updates[`${ROOT}/slotLocks/${safeKey(saved.date)}/${safeKey(String(saved.time).replace(':','-'))}`] = null;
    }
    setStatus('syncing', 'Updating the appointment record…');
    await database().ref().update(updates);
    setStatus('connected', 'Appointment status saved to Firebase');
    return saved;
  }

  async function updateEnquiry(record) {
    if (!admin) throw new Error('Staff authorization is required to update enquiries.');
    if (!record || !record.id) throw new Error('Enquiry reference is missing.');
    const saved = { ...record, id: safeKey(record.id), updatedAt: new Date().toISOString() };
    await database().ref(`${ROOT}/enquiries/${saved.id}`).set(saved);
    setStatus('connected', 'Enquiry status saved to Firebase');
    return saved;
  }

  async function ensureUser() {
    if (!auth) throw new Error('Firebase Authentication is unavailable.');
    if (auth.currentUser) { currentUser = auth.currentUser; return currentUser; }
    const result = await auth.signInAnonymously();
    currentUser = result.user;
    admin = await readAdminRole(currentUser);
    return currentUser;
  }
  async function submitAppointment(record) {
    await ensureUser();
    const user = auth.currentUser;
    const reference = safeKey(record.reference || `AUR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`);
    const slotDate = safeKey(record.date);
    const slotTime = safeKey(String(record.time).replace(':','-'));
    const lockRef = database().ref(`${ROOT}/slotLocks/${slotDate}/${slotTime}`);
    const lockResult = await lockRef.transaction(existing => existing === null ? { uid: user.uid, createdAt: new Date().toISOString() } : undefined, undefined, false);
    if (!lockResult.committed) throw new Error('That appointment time has just been requested by someone else. Please select another time.');
    const saved = { ...record, id: reference, reference, uid: user.uid, status: 'Requested', createdAt: record.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'website' };
    try {
      const updates = {};
      updates[`${ROOT}/appointmentQueue/${reference}`] = saved;
      updates[`${ROOT}/userAppointments/${user.uid}/${reference}`] = saved;
      await database().ref().update(updates);
      setStatus('connected', 'Appointment request saved to Firebase');
      return saved;
    } catch (error) {
      await lockRef.remove().catch(()=>{});
      throw error;
    }
  }
  async function submitEnquiry(record) {
    await ensureUser();
    const user = auth.currentUser;
    const id = safeKey(record.id || database().ref(`${ROOT}/enquiries`).push().key);
    const saved = { ...record, id, uid: user.uid, createdAt: record.createdAt || new Date().toISOString(), status: 'New', source: 'website' };
    await database().ref(`${ROOT}/enquiries/${id}`).set(saved);
    setStatus('connected', 'Enquiry saved to Firebase');
    return saved;
  }
  async function loadOwnAppointments() {
    if (!auth.currentUser) return [];
    const snap = await database().ref(`${ROOT}/userAppointments/${auth.currentUser.uid}`).once('value');
    return listFromMap(snap.val()).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }
  async function readOwnAppointment(reference) {
    if (!auth.currentUser) return null;
    const snap = await database().ref(`${ROOT}/userAppointments/${auth.currentUser.uid}/${safeKey(reference)}`).once('value');
    return snap.val() || null;
  }
  async function requestCancellation(reference) {
    if (!auth.currentUser) throw new Error('Sign in to manage an appointment request.');
    const user = auth.currentUser;
    const ref = database().ref(`${ROOT}/userAppointments/${user.uid}/${safeKey(reference)}`);
    const snap = await ref.once('value');
    const appointment = snap.val();
    if (!appointment) throw new Error('Appointment request not found for this account.');
    const updated = { ...appointment, status: 'Cancellation Requested', updatedAt: new Date().toISOString() };
    const updates = {};
    updates[`${ROOT}/userAppointments/${user.uid}/${safeKey(reference)}`] = updated;
    updates[`${ROOT}/appointmentQueue/${safeKey(reference)}`] = updated;
    await database().ref().update(updates);
    return updated;
  }

  async function signIn(email, password) {
    const result = await auth.signInWithEmailAndPassword(email, password);
    currentUser = result.user;
    admin = await readAdminRole(currentUser);
    setStatus('connected', admin ? 'Signed in · Staff access verified' : 'Signed in to patient account');
    return { user: cleanUser(currentUser), isAdmin: admin };
  }
  async function register(name, email, password) {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    currentUser = result.user;
    await currentUser.updateProfile({ displayName: name });
    await database().ref(`${ROOT}/users/${currentUser.uid}`).set({ uid: currentUser.uid, name, email, role: 'patient', createdAt: new Date().toISOString() });
    admin = false;
    setStatus('connected', 'Patient account created');
    return { user: cleanUser(currentUser), isAdmin: false };
  }
  async function resetPassword(email) { await auth.sendPasswordResetEmail(email); }
  async function signOut() { if (!auth) return; await auth.signOut(); currentUser = null; admin = false; setStatus('connected', 'Signed out'); }
  async function signInAdmin(email, password) {
    const result = await auth.signInWithEmailAndPassword(email, password);
    currentUser = result.user;
    admin = await readAdminRole(currentUser);
    if (!admin) { await auth.signOut(); currentUser = null; admin = false; throw new Error('This account is authenticated, but it has no clinic administrator role. Ask the project owner to grant the role in Realtime Database.'); }
    setStatus('connected', 'Staff access verified');
    return { user: cleanUser(currentUser), isAdmin: true };
  }
  async function getRole(uid) {
    if (!currentUser || currentUser.uid !== uid) return null;
    const snap = await database().ref(`${ROOT}/roles/${uid}`).once('value'); return snap.val() || null;
  }

  window.AurelleCloud = {
    init, isAdmin, getUser, getStatus, setStatusHandler: fn => { if (typeof fn === 'function') statusHandler = fn; },
    loadPublicData, loadAdminWorkspace, saveAdminWorkspace, watchPublic, watchSlotLocks, watchAdminCollections,
    submitAppointment, submitEnquiry, loadOwnAppointments, readOwnAppointment, requestCancellation,
    updateAppointmentStatus, updateEnquiry, replaceWorkspace,
    signIn, register, resetPassword, signOut, signInAdmin, getRole, listFromMap
  };
})();
