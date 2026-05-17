// common.js
// VLV EVENTS INVENTORY - Firebase Ready Common JS
// Is file ko pura replace karo. Ye localStorage ke bajay Firebase Firestore use karta hai.

const ADMIN_PHONE = "admin";
const ADMIN_PASSWORD = "1234";

let currentUser = null;
let cart = [];
let stockItems = [];
let bookingRequests = [];
let workerRequests = [];
let approvedWorkers = [];
let reports = [];

const stockRef = db.collection("stockItems");
const bookingRef = db.collection("bookingRequests");
const workerRequestRef = db.collection("workerRequests");
const approvedWorkerRef = db.collection("approvedWorkers");
const reportRef = db.collection("reports");

function toast(message) {
  const t = document.getElementById("toast");
  if (!t) {
    alert(message);
    return;
  }

  t.innerText = message;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2500);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function nowText() {
  return new Date().toLocaleString();
}

function toDateValue(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }

  return new Date(value);
}

function datesOverlap(start1, end1, start2, end2) {
  const selectedStart = toDateValue(start1);
  const selectedEnd = toDateValue(end1);
  const bookingStart = toDateValue(start2);
  const bookingEnd = toDateValue(end2);

  if (!selectedStart || !selectedEnd || !bookingStart || !bookingEnd) return false;

  return selectedStart <= bookingEnd && bookingStart <= selectedEnd;
}

function normalizeItem(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: doc.id || data.id || "",
    name: data.name || "",
    section: data.section || "",
    qty: safeNumber(data.qty, 0),
    min: safeNumber(data.min, 1),
    image: data.image || "",
    location: data.location || "",
    note: data.note || "",
    lastEvent: data.lastEvent || "",
    outOfStockAt: data.outOfStockAt || "",
    outOfStockEvent: data.outOfStockEvent || ""
  };
}

async function seedDemoStockIfEmpty() {
  const snap = await stockRef.limit(1).get();
  if (!snap.empty) return;

  const demoItems = [
    { name: "Golden Frame", section: "Frames", qty: 30, min: 5, note: "Frame rack F1" },
    { name: "LED Par Light", section: "Lights", qty: 20, min: 4, note: "Light box L2" },
    { name: "Artificial Flower Set", section: "Flower", qty: 35, min: 5, note: "Flower crate" },
    { name: "White Draping Cloth", section: "Cloth", qty: 50, min: 5, note: "Cloth rack C1" },
    { name: "Wedding Gate Prop", section: "Large Props", qty: 8, min: 2, note: "Large prop area" },
    { name: "Ring Tray", section: "Small Props", qty: 15, min: 3, note: "Small props shelf" },
    { name: "Centerpiece Stand", section: "Table Decor Items", qty: 25, min: 5, note: "Table decor shelf" }
  ];

  const batch = db.batch();

  demoItems.forEach(item => {
    const ref = stockRef.doc();
    batch.set(ref, {
      ...item,
      image: "",
      location: "",
      lastEvent: "",
      outOfStockAt: "",
      outOfStockEvent: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
}

function initFirebaseListeners() {
  stockRef.orderBy("name").onSnapshot(snapshot => {
    stockItems = snapshot.docs.map(normalizeItem);
    renderDashboard();
    renderStock();
    renderBookingItems();
  }, err => {
    console.error("stockItems error", err);
    toast("Stock load nahi hua. Firebase rules check karo.");
  });

  bookingRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
    bookingRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderRequests();
    renderBookingItems();
  }, err => {
    console.error("bookingRequests error", err);
  });

  workerRequestRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
    workerRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderWorkers();
  }, err => {
    console.error("workerRequests error", err);
    const box = document.getElementById("workerList");
    if (box) box.innerHTML = `<div class="section-card">Worker requests load nahi ho rahe. Firebase rules check karo.</div>`;
  });

  approvedWorkerRef.orderBy("approvedAt", "desc").onSnapshot(snapshot => {
    approvedWorkers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderWorkers();
  }, err => {
    console.error("approvedWorkers error", err);
  });

  reportRef.orderBy("createdAt", "desc").limit(200).onSnapshot(snapshot => {
    reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderReports();
  }, err => {
    console.error("reports error", err);
  });
}

function switchAuth(type) {
  const loginBox = document.getElementById("loginBox");
  const registerBox = document.getElementById("registerBox");
  const tabs = document.querySelectorAll(".tabs button");

  tabs.forEach(btn => btn.classList.remove("active"));

  if (type === "login") {
    loginBox.classList.remove("hidden");
    registerBox.classList.add("hidden");
    tabs[0].classList.add("active");
  } else {
    registerBox.classList.remove("hidden");
    loginBox.classList.add("hidden");
    tabs[1].classList.add("active");
  }
}

async function registerWorker() {
  const name = document.getElementById("regName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!name || !phone || !password) {
    toast("Please fill all fields");
    return;
  }

  try {
    const approvedSnap = await approvedWorkerRef.where("phone", "==", phone).limit(1).get();
    if (!approvedSnap.empty) {
      toast("This worker already approved. Login karo.");
      switchAuth("login");
      return;
    }

    const pendingSnap = await workerRequestRef.where("phone", "==", phone).where("status", "==", "pending").limit(1).get();
    if (!pendingSnap.empty) {
      toast("Is phone ka request already pending hai");
      return;
    }

    await workerRequestRef.add({
      name,
      phone,
      password,
      role: "worker",
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdDate: nowText()
    });

    document.getElementById("regName").value = "";
    document.getElementById("regPhone").value = "";
    document.getElementById("regPassword").value = "";

    toast("Request sent. Admin approve karega.");
    switchAuth("login");
  } catch (error) {
    console.error(error);
    toast("Request save nahi hua. Firebase rules/config check karo.");
  }
}

async function loginUser() {
  const phone = document.getElementById("loginPhone").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!phone || !password) {
    toast("Phone aur password enter karo");
    return;
  }

  if (phone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
    currentUser = {
      id: "admin",
      name: "Admin",
      phone: "admin",
      role: "admin",
      status: "approved"
    };

    sessionStorage.setItem("vlv_current_user", JSON.stringify(currentUser));
    loadApp();
    return;
  }

  try {
    const snap = await approvedWorkerRef.where("phone", "==", phone).where("password", "==", password).limit(1).get();

    if (snap.empty) {
      toast("Wrong phone/password ya admin approval pending hai");
      return;
    }

    const doc = snap.docs[0];
    currentUser = {
      id: doc.id,
      ...doc.data(),
      role: "worker",
      status: "approved"
    };

    sessionStorage.setItem("vlv_current_user", JSON.stringify(currentUser));
    loadApp();
  } catch (error) {
    console.error(error);
    toast("Login check nahi hua. Firebase rules/config check karo.");
  }
}

function logout() {
  sessionStorage.removeItem("vlv_current_user");
  currentUser = null;
  location.reload();
}

function loadApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");

  document.getElementById("welcomeName").innerText = currentUser.name;
  document.getElementById("userPill").innerHTML = `
    <i class="fa-solid fa-user"></i>
    <span>${escapeHtml(currentUser.name)}</span>
  `;

  applyRoleUI();
  initFirebaseListeners();
  showPage("home");
  renderCart();
}

function applyRoleUI() {
  const adminOnlyElements = document.querySelectorAll(".admin-only");

  adminOnlyElements.forEach(el => {
    if (!currentUser || currentUser.role !== "admin") {
      el.classList.add("hidden");
    } else {
      el.classList.remove("hidden");
    }
  });
}

function toggleDrawer() {
  document.getElementById("drawer").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.getElementById("drawer").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");

  renderDashboard();
  renderStock();
  renderBookingItems();
  renderRequests();
  renderWorkers();
  renderReports();
}

function renderDashboard() {
  const totalItemsEl = document.getElementById("totalItems");
  const lowStockEl = document.getElementById("lowStock");
  const pendingRequestsEl = document.getElementById("pendingRequests");
  const totalWorkersEl = document.getElementById("totalWorkers");

  if (totalItemsEl) totalItemsEl.innerText = stockItems.length;
  if (lowStockEl) lowStockEl.innerText = stockItems.filter(i => Number(i.qty) <= Number(i.min)).length;

  const pendingBookings = bookingRequests.filter(r => r.status === "pending").length;
  const pendingWorkers = workerRequests.filter(w => w.status === "pending").length;
  if (pendingRequestsEl) pendingRequestsEl.innerText = pendingBookings + pendingWorkers;

  if (totalWorkersEl) totalWorkersEl.innerText = approvedWorkers.length;
}

async function addItem() {
  if (!currentUser || currentUser.role !== "admin") {
    toast("Only admin can add stock");
    return;
  }

  const name = document.getElementById("itemName").value.trim();
  const section = document.getElementById("itemSection").value.trim();
  const qty = Number(document.getElementById("itemQty").value);
  const min = Number(document.getElementById("itemMin").value);
  const note = document.getElementById("itemNote").value.trim();

  if (!name || !section || isNaN(qty) || qty < 0) {
    toast("Please enter valid item details");
    return;
  }

  try {
    await stockRef.add({
      name,
      section,
      qty,
      min: min || 1,
      note,
      image: "",
      location: "",
      lastEvent: "",
      outOfStockAt: qty <= 0 ? nowText() : "",
      outOfStockEvent: qty <= 0 ? "Added as zero" : "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("itemName").value = "";
    document.getElementById("itemSection").value = "";
    document.getElementById("itemQty").value = "";
    document.getElementById("itemMin").value = "";
    document.getElementById("itemNote").value = "";

    await addReport({
      type: "New Stock",
      text: `${currentUser.name} added ${name} (${qty})`
    });

    toast("Item added successfully");
  } catch (error) {
    console.error(error);
    toast("Item add nahi hua. Firebase rules check karo.");
  }
}

function renderStock() {
  const tbody = document.getElementById("stockTable");
  if (!tbody) return;

  const search = document.getElementById("stockSearch")?.value.toLowerCase() || "";

  let items = stockItems.filter(item =>
    item.name.toLowerCase().includes(search) ||
    item.section.toLowerCase().includes(search)
  );

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No stock found</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    let stockClass = "ok";
    let stockText = "In Stock";

    if (Number(item.qty) <= 0) {
      stockClass = "danger";
      stockText = "Out of Stock";
    } else if (Number(item.qty) <= Number(item.min)) {
      stockClass = "low";
      stockText = "Low Stock";
    }

    return `
      <tr>
        <td><b>${escapeHtml(item.name)}</b><br><span class="badge ${stockClass}">${stockText}</span></td>
        <td>${escapeHtml(item.section)}</td>
        <td>${item.qty}</td>
        <td>${item.min}</td>
        <td>${escapeHtml(item.note || "-")}</td>
        <td class="admin-only">
          <button class="gray-btn" onclick="editStock('${item.id}')">Edit</button>
          <button class="danger-btn" onclick="deleteItem('${item.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  applyRoleUI();
}

async function editStock(id) {
  if (!currentUser || currentUser.role !== "admin") return;

  const item = stockItems.find(i => i.id === id);
  if (!item) return;

  const newQty = prompt(`Update quantity for ${item.name}`, item.qty);
  if (newQty === null) return;

  const qty = Number(newQty);
  if (isNaN(qty) || qty < 0) {
    toast("Valid quantity enter karo");
    return;
  }

  try {
    await stockRef.doc(id).update({
      qty,
      outOfStockAt: qty <= 0 ? nowText() : "",
      outOfStockEvent: qty <= 0 ? "Manual Stock Update" : "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await addReport({
      type: "Manual Stock Update",
      text: `${currentUser.name} updated ${item.name} quantity to ${qty}`
    });

    toast("Stock updated");
  } catch (error) {
    console.error(error);
    toast("Stock update nahi hua. Firebase rules check karo.");
  }
}

async function deleteItem(id) {
  if (!currentUser || currentUser.role !== "admin") return;
  if (!confirm("Delete this item?")) return;

  try {
    await stockRef.doc(id).delete();
    toast("Item deleted");
  } catch (error) {
    console.error(error);
    toast("Item delete nahi hua. Firebase rules check karo.");
  }
}

function getSelectedBookingDates() {
  const selectedStart = document.getElementById("eventDate")?.value || "";
  const selectedEnd = document.getElementById("returnDate")?.value || "";

  if (!selectedStart || !selectedEnd) return null;

  return {
    start: selectedStart,
    end: selectedEnd
  };
}

function getDateWiseAvailability(itemId, selectedStart, selectedEnd) {
  const item = stockItems.find(i => String(i.id) === String(itemId));
  const totalQty = item ? Number(item.qty) : 0;

  let approvedBookedQty = 0;
  let pendingBookedQty = 0;
  const bookedEvents = [];

  bookingRequests
    .filter(req => ["approved", "pending"].includes(req.status))
    .filter(req => datesOverlap(selectedStart, selectedEnd, req.eventDate, req.returnDate))
    .forEach(req => {
      const bookedItem = (req.items || []).find(i => String(i.id) === String(itemId));
      if (!bookedItem) return;

      const qty = Number(bookedItem.qty) || 0;

      if (req.status === "approved") approvedBookedQty += qty;
      if (req.status === "pending") pendingBookedQty += qty;

      bookedEvents.push({
        eventName: req.eventName,
        eventDate: req.eventDate,
        returnDate: req.returnDate,
        workerName: req.workerName,
        status: req.status,
        qty
      });
    });

  return {
    totalQty,
    approvedBookedQty,
    pendingBookedQty,
    availableQty: Math.max(totalQty - approvedBookedQty, 0),
    bookedEvents
  };
}

function checkDateStock() {
  const dates = getSelectedBookingDates();

  if (!dates) {
    toast("Select From Date and To Date");
    renderBookingItems();
    return;
  }

  if (toDateValue(dates.start) > toDateValue(dates.end)) {
    toast("To Date must be same or after From Date");
    return;
  }

  renderBookingItems();
  toast("Date-wise stock updated");
}

function getAvailabilityBadge(item, availability) {
  if (availability.availableQty <= 0) return { className: "availability-not", text: "Not Available" };
  if (availability.pendingBookedQty > 0) return { className: "availability-pending", text: "Pending Booking Exists" };

  const lowLimit = Math.max(Number(item.min) || 0, Math.ceil(availability.totalQty * 0.2));
  if (availability.availableQty <= lowLimit) return { className: "availability-low", text: "Low Available" };

  return { className: "availability-ok", text: "Available" };
}

function renderBookingItems() {
  const box = document.getElementById("bookingItems");
  if (!box) return;

  const search = document.getElementById("bookingSearch")?.value.toLowerCase() || "";
  const dates = getSelectedBookingDates();

  let items = stockItems.filter(item =>
    item.name.toLowerCase().includes(search) ||
    item.section.toLowerCase().includes(search)
  );

  if (items.length === 0) {
    box.innerHTML = `<div class="section-card">No item found</div>`;
    return;
  }

  if (!dates) {
    box.innerHTML = items.map(item => `
      <div class="item-card">
        <h3>${escapeHtml(item.name)}</h3>
        <p><b>Section:</b> ${escapeHtml(item.section)}</p>
        <p><b>Total stock:</b> ${item.qty}</p>
        <p><b>Note:</b> ${escapeHtml(item.note || "-")}</p>
        <div class="date-empty-message">Select date range to check availability.</div>
        <div class="book-row">
          <input type="number" min="1" id="qty_${item.id}" placeholder="Qty" disabled />
          <button class="primary-btn" disabled>Add</button>
        </div>
      </div>
    `).join("");
    return;
  }

  if (toDateValue(dates.start) > toDateValue(dates.end)) {
    box.innerHTML = `<div class="section-card">To Date must be same or after From Date.</div>`;
    return;
  }

  box.innerHTML = items.map(item => {
    const availability = getDateWiseAvailability(item.id, dates.start, dates.end);
    const badge = getAvailabilityBadge(item, availability);
    const disabled = availability.availableQty <= 0 ? "disabled" : "";

    const bookedDetails = availability.bookedEvents.length
      ? availability.bookedEvents.map(event => `
          <div class="booked-event-card">
            <b>${escapeHtml(event.eventName)}</b>
            <span class="badge ${event.status}">${event.status}</span>
            <p>${event.eventDate} to ${event.returnDate}</p>
            <p>Qty: ${event.qty} | Worker: ${escapeHtml(event.workerName)}</p>
          </div>
        `).join("")
      : `<p class="muted">No approved or pending booking in this date range.</p>`;

    return `
      <div class="item-card">
        <div class="item-card-head">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="availability-badge ${badge.className}">${badge.text}</span>
        </div>
        <p><b>Section:</b> ${escapeHtml(item.section)}</p>
        <p><b>Total stock:</b> ${availability.totalQty}</p>
        <p><b>Booked on selected date range:</b> ${availability.approvedBookedQty}</p>
        <p><b>Pending on this date:</b> ${availability.pendingBookedQty}</p>
        <p><b>Available on selected date range:</b> ${availability.availableQty}</p>
        <p><b>Note:</b> ${escapeHtml(item.note || "-")}</p>
        <div class="booked-events"><b>Already booked in:</b>${bookedDetails}</div>
        <div class="book-row">
          <input type="number" min="1" max="${availability.availableQty}" id="qty_${item.id}" placeholder="Max ${availability.availableQty}" ${disabled} />
          <button class="primary-btn" onclick="addToCart('${item.id}')" ${disabled}>Add</button>
        </div>
      </div>
    `;
  }).join("");
}

function addToCart(id) {
  const item = stockItems.find(i => String(i.id) === String(id));
  const qty = Number(document.getElementById(`qty_${id}`).value);
  const dates = getSelectedBookingDates();

  if (!qty || qty <= 0) {
    toast("Enter valid quantity");
    return;
  }

  if (!dates) {
    toast("Select event date range first");
    return;
  }

  if (toDateValue(dates.start) > toDateValue(dates.end)) {
    toast("To Date must be same or after From Date");
    return;
  }

  const availability = getDateWiseAvailability(id, dates.start, dates.end);
  const existing = cart.find(c => String(c.id) === String(id));
  const existingQty = existing ? Number(existing.qty) : 0;

  if (existingQty + qty > availability.availableQty) {
    toast(`Only ${availability.availableQty} available for selected date range`);
    return;
  }

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: item.id, name: item.name, section: item.section, qty });
  }

  document.getElementById(`qty_${id}`).value = "";
  renderCart();
  toast("Added to request");
}

function renderCart() {
  const box = document.getElementById("cartList");
  if (!box) return;

  if (cart.length === 0) {
    box.innerHTML = `<p class="muted">No selected items yet.</p>`;
    return;
  }

  box.innerHTML = cart.map((c, index) => `
    <div class="cart-item">
      <b>${escapeHtml(c.name)}</b>
      <p>Section: ${escapeHtml(c.section)} | Quantity: ${c.qty}</p>
      <button class="danger-btn" onclick="removeCart(${index})">Remove</button>
    </div>
  `).join("");
}

function removeCart(index) {
  cart.splice(index, 1);
  renderCart();
}

async function submitBooking() {
  const eventName = document.getElementById("eventName").value.trim();
  const eventDate = document.getElementById("eventDate").value;
  const returnDate = document.getElementById("returnDate").value;
  const eventLocation = document.getElementById("eventLocation").value.trim();
  const note = document.getElementById("bookingNote").value.trim();

  if (!eventName || !eventDate || !returnDate || !eventLocation) {
    toast("Please fill event details");
    return;
  }

  if (toDateValue(eventDate) > toDateValue(returnDate)) {
    toast("To Date must be same or after From Date");
    return;
  }

  if (cart.length === 0) {
    toast("Please select items");
    return;
  }

  for (let cartItem of cart) {
    const availability = getDateWiseAvailability(cartItem.id, eventDate, returnDate);
    if (Number(cartItem.qty) > availability.availableQty) {
      toast(`${cartItem.name} has only ${availability.availableQty} available for selected dates`);
      renderBookingItems();
      return;
    }
  }

  try {
    await bookingRef.add({
      workerId: currentUser.id,
      workerName: currentUser.name,
      eventName,
      eventDate,
      returnDate,
      eventLocation,
      note,
      items: cart.map(item => ({ ...item })),
      status: "pending",
      returned: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdDate: nowText()
    });

    cart = [];
    renderCart();

    document.getElementById("eventName").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("returnDate").value = "";
    document.getElementById("eventLocation").value = "";
    document.getElementById("bookingNote").value = "";

    toast("Booking request submitted");
  } catch (error) {
    console.error(error);
    toast("Booking request save nahi hua. Firebase rules check karo.");
  }
}

function renderRequests() {
  const box = document.getElementById("requestList");
  if (!box || !currentUser) return;

  let requests = [...bookingRequests];

  if (currentUser.role !== "admin") {
    requests = requests.filter(r => r.workerId === currentUser.id);
  }

  if (requests.length === 0) {
    box.innerHTML = `<div class="section-card">No requests found</div>`;
    return;
  }

  box.innerHTML = requests.map(req => `
    <div class="request-card">
      <div class="request-top">
        <div>
          <h3>${escapeHtml(req.eventName)}</h3>
          <p><b>Worker:</b> ${escapeHtml(req.workerName)}<br><b>Date:</b> ${req.eventDate}<br><b>Return:</b> ${req.returnDate}<br><b>Location:</b> ${escapeHtml(req.eventLocation)}</p>
        </div>
        <span class="badge ${req.status}">${String(req.status).toUpperCase()}</span>
      </div>
      <p><b>Items:</b></p>
      <ul>${(req.items || []).map(i => `<li>${escapeHtml(i.name)} - ${i.qty} pcs</li>`).join("")}</ul>
      <p><b>Note:</b> ${escapeHtml(req.note || "-")}</p>
      <p><b>Created:</b> ${escapeHtml(req.createdDate || "-")}</p>
      <p><b>Returned:</b> ${req.returned ? "Yes" : "No"}</p>
      <div class="request-actions">
        ${currentUser.role === "admin" && req.status === "pending" ? `<button class="success-btn" onclick="approveRequest('${req.id}')">Approve Issue</button><button class="danger-btn" onclick="rejectRequest('${req.id}')">Reject</button>` : ""}
        ${currentUser.role === "admin" && req.status === "approved" && !req.returned ? `<button class="gray-btn" onclick="markReturned('${req.id}')">Mark Returned</button>` : ""}
      </div>
    </div>
  `).join("");
}

async function approveRequest(id) {
  if (!currentUser || currentUser.role !== "admin") return;

  const req = bookingRequests.find(r => r.id === id);
  if (!req) return;

  for (let requestedItem of req.items || []) {
    const availability = getDateWiseAvailability(requestedItem.id, req.eventDate, req.returnDate);
    if (Number(requestedItem.qty) > availability.availableQty) {
      toast(`${requestedItem.name} stock not enough for selected dates`);
      return;
    }
  }

  try {
    await bookingRef.doc(id).update({
      status: "approved",
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedDate: nowText(),
      approvedBy: currentUser.name
    });

    await addReport({
      type: "Issue Approved",
      text: `${currentUser.name} approved ${req.eventName}. Items reserved by date for ${req.workerName}.`
    });

    toast("Request approved and date-wise stock reserved");
  } catch (error) {
    console.error(error);
    toast("Request approve nahi hua. Firebase rules check karo.");
  }
}

async function rejectRequest(id) {
  if (!currentUser || currentUser.role !== "admin") return;

  const req = bookingRequests.find(r => r.id === id);
  if (!req) return;

  try {
    await bookingRef.doc(id).update({
      status: "rejected",
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
      rejectedDate: nowText()
    });

    await addReport({
      type: "Request Rejected",
      text: `${currentUser.name} rejected request for ${req.eventName}.`
    });

    toast("Request rejected");
  } catch (error) {
    console.error(error);
    toast("Request reject nahi hua. Firebase rules check karo.");
  }
}

async function markReturned(id) {
  if (!currentUser || currentUser.role !== "admin") return;

  const req = bookingRequests.find(r => r.id === id);
  if (!req) return;

  try {
    await bookingRef.doc(id).update({
      returned: true,
      returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
      returnedDate: nowText()
    });

    await addReport({
      type: "Items Returned",
      text: `${req.workerName} returned items from ${req.eventName}. Booking remains in date-wise history.`
    });

    toast("Items marked as returned");
  } catch (error) {
    console.error(error);
    toast("Return mark nahi hua. Firebase rules check karo.");
  }
}

function renderWorkers() {
  const box = document.getElementById("workerList");
  if (!box || !currentUser) return;

  if (currentUser.role !== "admin") {
    box.innerHTML = `<div class="section-card">Only admin can manage workers.</div>`;
    return;
  }

  const pending = workerRequests.filter(w => w.status === "pending");
  const rejected = workerRequests.filter(w => w.status === "rejected");

  let html = "";

  html += `<div class="section-card"><h2>Pending Worker Requests</h2>`;
  if (pending.length === 0) {
    html += `<p class="muted">No pending worker request found.</p>`;
  } else {
    html += pending.map(user => `
      <div class="request-card">
        <div class="request-top">
          <div><h3>${escapeHtml(user.name)}</h3><p><b>Phone:</b> ${escapeHtml(user.phone)}<br><b>Created:</b> ${escapeHtml(user.createdDate || "-")}</p></div>
          <span class="badge pending">PENDING</span>
        </div>
        <div class="request-actions">
          <button class="success-btn" onclick="approveWorker('${user.id}')">Approve</button>
          <button class="danger-btn" onclick="rejectWorker('${user.id}')">Reject</button>
        </div>
      </div>
    `).join("");
  }
  html += `</div>`;

  html += `<div class="section-card"><h2>Approved Workers</h2>`;
  if (approvedWorkers.length === 0) {
    html += `<p class="muted">No approved worker found.</p>`;
  } else {
    html += approvedWorkers.map(user => `
      <div class="request-card">
        <div class="request-top">
          <div><h3>${escapeHtml(user.name)}</h3><p><b>Phone:</b> ${escapeHtml(user.phone)}<br><b>Approved:</b> ${escapeHtml(user.approvedDate || "-")}</p></div>
          <span class="badge approved">APPROVED</span>
        </div>
        <div class="request-actions"><button class="danger-btn" onclick="deleteWorker('${user.id}')">Remove Access</button></div>
      </div>
    `).join("");
  }
  html += `</div>`;

  if (rejected.length > 0) {
    html += `<div class="section-card"><h2>Rejected Requests</h2>`;
    html += rejected.map(user => `
      <div class="request-card">
        <h3>${escapeHtml(user.name)}</h3>
        <p><b>Phone:</b> ${escapeHtml(user.phone)}</p>
        <button class="gray-btn" onclick="restoreWorkerRequest('${user.id}')">Restore Pending</button>
      </div>
    `).join("");
    html += `</div>`;
  }

  box.innerHTML = html;
}

async function approveWorker(id) {
  const user = workerRequests.find(u => u.id === id);
  if (!user) return;

  try {
    await approvedWorkerRef.add({
      name: user.name,
      phone: user.phone,
      password: user.password,
      role: "worker",
      status: "approved",
      requestId: id,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedDate: nowText()
    });

    await workerRequestRef.doc(id).update({
      status: "approved",
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedDate: nowText()
    });

    await addReport({
      type: "Worker Approved",
      text: `${currentUser.name} approved worker ${user.name}.`
    });

    toast("Worker approved");
  } catch (error) {
    console.error(error);
    toast("Worker approve nahi hua. Firebase rules check karo.");
  }
}

async function rejectWorker(id) {
  const user = workerRequests.find(u => u.id === id);
  if (!user) return;

  try {
    await workerRequestRef.doc(id).update({
      status: "rejected",
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
      rejectedDate: nowText()
    });

    toast("Worker rejected");
  } catch (error) {
    console.error(error);
    toast("Worker reject nahi hua. Firebase rules check karo.");
  }
}

async function restoreWorkerRequest(id) {
  try {
    await workerRequestRef.doc(id).update({ status: "pending" });
    toast("Request restored");
  } catch (error) {
    console.error(error);
    toast("Restore nahi hua");
  }
}

async function blockWorker(id) {
  await deleteWorker(id);
}

async function deleteWorker(id) {
  if (!confirm("Remove this worker access?")) return;

  try {
    await approvedWorkerRef.doc(id).delete();
    toast("Worker access removed");
  } catch (error) {
    console.error(error);
    toast("Worker remove nahi hua. Firebase rules check karo.");
  }
}

async function addReport(data) {
  try {
    await reportRef.add({
      type: data.type,
      text: data.text,
      time: nowText(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Report save error", error);
  }
}

function renderReports() {
  const box = document.getElementById("reportList");
  if (!box) return;

  if (reports.length === 0) {
    box.innerHTML = `<p class="muted">No reports yet.</p>`;
    return;
  }

  box.innerHTML = reports.map(r => `
    <div class="report-card">
      <b>${escapeHtml(r.type)}</b>
      <p>${escapeHtml(r.text)}</p>
      <small>${escapeHtml(r.time || "-")}</small>
    </div>
  `).join("");
}

function openSection(sectionName) {
  location.href = `stock.html?section=${encodeURIComponent(sectionName)}`;
}

function clearStockFilter() {
  const searchInput = document.getElementById("stockSearch");
  if (searchInput) searchInput.value = "";
  renderStock();
  toast("All stock shown");
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof firebase === "undefined" || typeof db === "undefined") {
    toast("Firebase load nahi hua. firebase-config.js aur scripts check karo.");
    return;
  }

  try {
    await seedDemoStockIfEmpty();
  } catch (error) {
    console.error(error);
    toast("Demo stock load nahi hua. Firestore enable/rules check karo.");
  }

  const savedUser = sessionStorage.getItem("vlv_current_user");

  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    loadApp();
  } else {
    document.getElementById("authPage").classList.remove("hidden");
    document.getElementById("appPage").classList.add("hidden");
  }

  renderCart();
});
