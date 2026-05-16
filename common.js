const STORAGE = {
  users: "event_inventory_users",
  items: "event_inventory_items",
  requests: "event_inventory_requests",
  reports: "event_inventory_reports",
  session: "event_inventory_session"
};

let currentUser = null;
let cart = [];

function getData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(message) {
  const t = document.getElementById("toast");
  t.innerText = message;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2500);
}

function initData() {
  let users = getData(STORAGE.users);
  let items = getData(STORAGE.items);

  const adminExists = users.some(u => u.role === "admin");

  if (!adminExists) {
    users.push({
      id: Date.now(),
      name: "Admin",
      phone: "admin",
      password: "1234",
      role: "admin",
      status: "approved",
      createdAt: new Date().toLocaleString()
    });

    setData(STORAGE.users, users);
  }

  if (items.length === 0) {
    items = [
      {
        id: 1,
        name: "Golden Frame",
        section: "Frames",
        qty: 30,
        min: 5,
        note: "Frame rack F1"
      },
      {
        id: 2,
        name: "LED Par Light",
        section: "Lights",
        qty: 20,
        min: 4,
        note: "Light box L2"
      },
      {
        id: 3,
        name: "Artificial Flower Set",
        section: "Flower",
        qty: 35,
        min: 5,
        note: "Flower crate"
      },
      {
        id: 4,
        name: "White Draping Cloth",
        section: "Cloth",
        qty: 50,
        min: 5,
        note: "Cloth rack C1"
      },
      {
        id: 5,
        name: "Wedding Gate Prop",
        section: "Large Props",
        qty: 8,
        min: 2,
        note: "Large prop area"
      },
      {
        id: 6,
        name: "Ring Tray",
        section: "Small Props",
        qty: 15,
        min: 3,
        note: "Small props shelf"
      },
      {
        id: 7,
        name: "Centerpiece Stand",
        section: "Table Decor Items",
        qty: 25,
        min: 5,
        note: "Table decor shelf"
      }
    ];

    setData(STORAGE.items, items);
  }
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

function registerWorker() {
  const name = document.getElementById("regName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!name || !phone || !password) {
    toast("Please fill all fields");
    return;
  }

  let users = getData(STORAGE.users);

  const exists = users.some(u => u.phone === phone);
  if (exists) {
    toast("This phone already exists");
    return;
  }

  users.push({
    id: Date.now(),
    name,
    phone,
    password,
    role: "worker",
    status: "pending",
    createdAt: new Date().toLocaleString()
  });

  setData(STORAGE.users, users);

  document.getElementById("regName").value = "";
  document.getElementById("regPhone").value = "";
  document.getElementById("regPassword").value = "";

  toast("Request sent. Wait for admin approval.");
  switchAuth("login");
}

function loginUser() {
  const phone = document.getElementById("loginPhone").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  let users = getData(STORAGE.users);

  const user = users.find(u => u.phone === phone && u.password === password);

  if (!user) {
    toast("Wrong phone or password");
    return;
  }

  if (user.status !== "approved") {
    toast("Account not approved yet");
    return;
  }

  localStorage.setItem(STORAGE.session, JSON.stringify(user));
  currentUser = user;

  loadApp();
}

function logout() {
  localStorage.removeItem(STORAGE.session);
  currentUser = null;
  location.reload();
}

function loadApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");

  document.getElementById("welcomeName").innerText = currentUser.name;
  document.getElementById("userPill").innerHTML = `
    <i class="fa-solid fa-user"></i>
    <span>${currentUser.name}</span>
  `;

  applyRoleUI();

  renderDashboard();
  renderStock();
  renderBookingItems();
  renderRequests();
  renderWorkers();
  renderReports();
}

function applyRoleUI() {
  const adminOnlyElements = document.querySelectorAll(".admin-only");

  adminOnlyElements.forEach(el => {
    if (currentUser.role !== "admin") {
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
  const items = getData(STORAGE.items);
  const users = getData(STORAGE.users);
  const requests = getData(STORAGE.requests);

  document.getElementById("totalItems").innerText = items.length;

  document.getElementById("lowStock").innerText =
    items.filter(i => Number(i.qty) <= Number(i.min)).length;

  document.getElementById("pendingRequests").innerText =
    requests.filter(r => r.status === "pending").length;

  document.getElementById("totalWorkers").innerText =
    users.filter(u => u.role === "worker" && u.status === "approved").length;
}

function addItem() {
  if (currentUser.role !== "admin") {
    toast("Only admin can add stock");
    return;
  }

  const name = document.getElementById("itemName").value.trim();
  const section = document.getElementById("itemSection").value.trim();
  const qty = Number(document.getElementById("itemQty").value);
  const min = Number(document.getElementById("itemMin").value);
  const note = document.getElementById("itemNote").value.trim();

  if (!name || !section || qty < 0 || !qty) {
    toast("Please enter valid item details");
    return;
  } 

  let items = getData(STORAGE.items);

  items.push({
    id: Date.now(),
    name,
    section,
    qty,
    min: min || 1,
    note
  });

  setData(STORAGE.items, items);

  document.getElementById("itemName").value = "";
  document.getElementById("itemSection").value = "";
  document.getElementById("itemQty").value = "";
  document.getElementById("itemMin").value = "";
  document.getElementById("itemNote").value = "";

  toast("Item added successfully");
  renderStock();
  renderDashboard();
}

function renderStock() {
  const tbody = document.getElementById("stockTable");
  const search = document.getElementById("stockSearch")?.value.toLowerCase() || "";

  let items = getData(STORAGE.items);

  items = items.filter(item =>
    item.name.toLowerCase().includes(search) ||
    item.section.toLowerCase().includes(search)
  );

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No stock found</td>
      </tr>
    `;
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
        <td>
          <b>${item.name}</b><br>
          <span class="badge ${stockClass}">${stockText}</span>
        </td>
        <td>${item.section}</td>
        <td>${item.qty}</td>
        <td>${item.min}</td>
        <td>${item.note || "-"}</td>
        <td class="admin-only">
          <button class="gray-btn" onclick="editStock(${item.id})">Edit</button>
          <button class="danger-btn" onclick="deleteItem(${item.id})">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  applyRoleUI();
}

function editStock(id) {
  if (currentUser.role !== "admin") return;

  let items = getData(STORAGE.items);
  let item = items.find(i => i.id === id);

  const newQty = prompt(`Update quantity for ${item.name}`, item.qty);
  if (newQty === null) return;

  item.qty = Number(newQty);
  setData(STORAGE.items, items);

  addReport({
    type: "Manual Stock Update",
    text: `${currentUser.name} updated ${item.name} quantity to ${item.qty}`
  });

  toast("Stock updated");
  renderStock();
  renderDashboard();
}

function deleteItem(id) {
  if (currentUser.role !== "admin") return;

  if (!confirm("Delete this item?")) return;

  let items = getData(STORAGE.items);
  items = items.filter(i => i.id !== id);

  setData(STORAGE.items, items);

  toast("Item deleted");
  renderStock();
  renderDashboard();
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

function getDateWiseAvailability(itemId, selectedStart, selectedEnd) {
  const items = getData(STORAGE.items);
  const requests = getData(STORAGE.requests);
  const item = items.find(i => Number(i.id) === Number(itemId));
  const totalQty = item ? Number(item.qty) : 0;

  let approvedBookedQty = 0;
  let pendingBookedQty = 0;
  const bookedEvents = [];

  requests
    .filter(req => ["approved", "pending"].includes(req.status))
    .filter(req => datesOverlap(selectedStart, selectedEnd, req.eventDate, req.returnDate))
    .forEach(req => {
      const bookedItem = (req.items || []).find(i => Number(i.id) === Number(itemId));
      if (!bookedItem) return;

      const qty = Number(bookedItem.qty) || 0;

      if (req.status === "approved") {
        approvedBookedQty += qty;
      }

      if (req.status === "pending") {
        pendingBookedQty += qty;
      }

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
  if (availability.availableQty <= 0) {
    return {
      className: "availability-not",
      text: "Not Available"
    };
  }

  if (availability.pendingBookedQty > 0) {
    return {
      className: "availability-pending",
      text: "Pending Booking Exists"
    };
  }

  const lowLimit = Math.max(Number(item.min) || 0, Math.ceil(availability.totalQty * 0.2));
  if (availability.availableQty <= lowLimit) {
    return {
      className: "availability-low",
      text: "Low Available"
    };
  }

  return {
    className: "availability-ok",
    text: "Available"
  };
}

function renderBookingItems() {
  const box = document.getElementById("bookingItems");
  const search = document.getElementById("bookingSearch")?.value.toLowerCase() || "";
  const dates = getSelectedBookingDates();

  let items = getData(STORAGE.items);

  items = items.filter(item =>
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
        <h3>${item.name}</h3>
        <p><b>Section:</b> ${item.section}</p>
        <p><b>Total stock:</b> ${item.qty}</p>
        <p><b>Note:</b> ${item.note || "-"}</p>
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
            <b>${event.eventName}</b>
            <span class="badge ${event.status}">${event.status}</span>
            <p>${event.eventDate} to ${event.returnDate}</p>
            <p>Qty: ${event.qty} | Worker: ${event.workerName}</p>
          </div>
        `).join("")
      : `<p class="muted">No approved or pending booking in this date range.</p>`;

    return `
      <div class="item-card">
        <div class="item-card-head">
          <h3>${item.name}</h3>
          <span class="availability-badge ${badge.className}">${badge.text}</span>
        </div>
        <p><b>Section:</b> ${item.section}</p>
        <p><b>Total stock:</b> ${availability.totalQty}</p>
        <p><b>Booked on selected date range:</b> ${availability.approvedBookedQty}</p>
        <p><b>Pending on this date:</b> ${availability.pendingBookedQty}</p>
        <p><b>Available on selected date range:</b> ${availability.availableQty}</p>
        <p><b>Note:</b> ${item.note || "-"}</p>

        <div class="booked-events">
          <b>Already booked in:</b>
          ${bookedDetails}
        </div>

        <div class="book-row">
          <input type="number" min="1" max="${availability.availableQty}" id="qty_${item.id}" placeholder="Max ${availability.availableQty}" ${disabled} />
          <button class="primary-btn" onclick="addToCart(${item.id})" ${disabled}>
            Add
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function addToCart(id) {
  const items = getData(STORAGE.items);
  const item = items.find(i => Number(i.id) === Number(id));
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
  const existing = cart.find(c => Number(c.id) === Number(id));
  const existingQty = existing ? Number(existing.qty) : 0;

  if (existingQty + qty > availability.availableQty) {
    toast(`Only ${availability.availableQty} available for selected date range`);
    return;
  }

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      section: item.section,
      qty
    });
  }

  document.getElementById(`qty_${id}`).value = "";
  renderCart();
  toast("Added to request");
}

function renderCart() {
  const box = document.getElementById("cartList");

  if (cart.length === 0) {
    box.innerHTML = `<p class="muted">No selected items yet.</p>`;
    return;
  }

  box.innerHTML = cart.map((c, index) => `
    <div class="cart-item">
      <b>${c.name}</b>
      <p>Section: ${c.section} | Quantity: ${c.qty}</p>
      <button class="danger-btn" onclick="removeCart(${index})">Remove</button>
    </div>
  `).join("");
}

function removeCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function submitBooking() {
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

  let requests = getData(STORAGE.requests);

  requests.push({
    id: Date.now(),
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
    createdAt: new Date().toLocaleString()
  });

  setData(STORAGE.requests, requests);

  cart = [];
  renderCart();

  document.getElementById("eventName").value = "";
  document.getElementById("eventDate").value = "";
  document.getElementById("returnDate").value = "";
  document.getElementById("eventLocation").value = "";
  document.getElementById("bookingNote").value = "";

  toast("Booking request submitted");
  renderBookingItems();
  renderRequests();
  renderDashboard();
}

function renderRequests() {
  const box = document.getElementById("requestList");

  let requests = getData(STORAGE.requests);

  if (currentUser.role !== "admin") {
    requests = requests.filter(r => r.workerId === currentUser.id);
  }

  if (requests.length === 0) {
    box.innerHTML = `<div class="section-card">No requests found</div>`;
    return;
  }

  requests = requests.sort((a, b) => b.id - a.id);

  box.innerHTML = requests.map(req => `
    <div class="request-card">
      <div class="request-top">
        <div>
          <h3>${req.eventName}</h3>
          <p>
            <b>Worker:</b> ${req.workerName}<br>
            <b>Date:</b> ${req.eventDate}<br>
            <b>Return:</b> ${req.returnDate}<br>
            <b>Location:</b> ${req.eventLocation}
          </p>
        </div>

        <span class="badge ${req.status}">
          ${req.status.toUpperCase()}
        </span>
      </div>

      <p><b>Items:</b></p>
      <ul>
        ${req.items.map(i => `<li>${i.name} - ${i.qty} pcs</li>`).join("")}
      </ul>

      <p><b>Note:</b> ${req.note || "-"}</p>
      <p><b>Created:</b> ${req.createdAt}</p>
      <p><b>Returned:</b> ${req.returned ? "Yes" : "No"}</p>

      <div class="request-actions">
        ${
          currentUser.role === "admin" && req.status === "pending"
          ? `
            <button class="success-btn" onclick="approveRequest(${req.id})">
              Approve Issue
            </button>
            <button class="danger-btn" onclick="rejectRequest(${req.id})">
              Reject
            </button>
          `
          : ""
        }

        ${
          currentUser.role === "admin" && req.status === "approved" && !req.returned
          ? `
            <button class="gray-btn" onclick="markReturned(${req.id})">
              Mark Returned
            </button>
          `
          : ""
        }
      </div>
    </div>
  `).join("");
}

function approveRequest(id) {
  if (currentUser.role !== "admin") return;

  let requests = getData(STORAGE.requests);
  const req = requests.find(r => r.id === id);

  for (let requestedItem of req.items) {
    const availability = getDateWiseAvailability(requestedItem.id, req.eventDate, req.returnDate);

    if (Number(requestedItem.qty) > availability.availableQty) {
      toast(`${requestedItem.name} stock not enough for selected dates`);
      return;
    }
  }

  req.status = "approved";
  req.approvedAt = new Date().toLocaleString();
  req.approvedBy = currentUser.name;

  setData(STORAGE.requests, requests);

  addReport({
    type: "Issue Approved",
    text: `${currentUser.name} approved ${req.eventName}. Items reserved by date for ${req.workerName}.`
  });

  toast("Request approved and date-wise stock reserved");
  renderRequests();
  renderBookingItems();
  renderStock();
  renderDashboard();
  renderReports();
}

function rejectRequest(id) {
  if (currentUser.role !== "admin") return;

  let requests = getData(STORAGE.requests);
  const req = requests.find(r => r.id === id);

  req.status = "rejected";
  req.rejectedAt = new Date().toLocaleString();

  setData(STORAGE.requests, requests);

  addReport({
    type: "Request Rejected",
    text: `${currentUser.name} rejected request for ${req.eventName}.`
  });

  toast("Request rejected");
  renderRequests();
  renderDashboard();
  renderReports();
}

function markReturned(id) {
  if (currentUser.role !== "admin") return;

  let requests = getData(STORAGE.requests);
  const req = requests.find(r => r.id === id);

  req.returned = true;
  req.returnedAt = new Date().toLocaleString();

  setData(STORAGE.requests, requests);

  addReport({
    type: "Items Returned",
    text: `${req.workerName} returned items from ${req.eventName}. Booking remains in date-wise history.`
  });

  toast("Items marked as returned");
  renderRequests();
  renderBookingItems();
  renderStock();
  renderDashboard();
  renderReports();
}

function renderWorkers() {
  const box = document.getElementById("workerList");

  if (currentUser.role !== "admin") {
    box.innerHTML = `<div class="section-card">Only admin can manage workers.</div>`;
    return;
  }

  let users = getData(STORAGE.users).filter(u => u.role === "worker");

  if (users.length === 0) {
    box.innerHTML = `<div class="section-card">No workers found</div>`;
    return;
  }

  users = users.sort((a, b) => b.id - a.id);

  box.innerHTML = users.map(user => `
    <div class="request-card">
      <div class="request-top">
        <div>
          <h3>${user.name}</h3>
          <p>
            <b>Phone:</b> ${user.phone}<br>
            <b>Created:</b> ${user.createdAt}
          </p>
        </div>

        <span class="badge ${user.status}">
          ${user.status.toUpperCase()}
        </span>
      </div>

      <div class="request-actions">
        ${
          user.status === "pending"
          ? `<button class="success-btn" onclick="approveWorker(${user.id})">Approve</button>`
          : ""
        }

        ${
          user.status === "approved"
          ? `<button class="danger-btn" onclick="blockWorker(${user.id})">Block</button>`
          : `<button class="gray-btn" onclick="approveWorker(${user.id})">Activate</button>`
        }

        <button class="danger-btn" onclick="deleteWorker(${user.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

function approveWorker(id) {
  let users = getData(STORAGE.users);
  let user = users.find(u => u.id === id);

  user.status = "approved";

  setData(STORAGE.users, users);

  addReport({
    type: "Worker Approved",
    text: `${currentUser.name} approved worker ${user.name}.`
  });

  toast("Worker approved");
  renderWorkers();
  renderDashboard();
}

function blockWorker(id) {
  let users = getData(STORAGE.users);
  let user = users.find(u => u.id === id);

  user.status = "blocked";

  setData(STORAGE.users, users);

  toast("Worker blocked");
  renderWorkers();
  renderDashboard();
}

function deleteWorker(id) {
  if (!confirm("Delete this worker?")) return;

  let users = getData(STORAGE.users);
  users = users.filter(u => u.id !== id);

  setData(STORAGE.users, users);

  toast("Worker deleted");
  renderWorkers();
  renderDashboard();
}

function addReport(data) {
  let reports = getData(STORAGE.reports);

  reports.push({
    id: Date.now(),
    type: data.type,
    text: data.text,
    time: new Date().toLocaleString()
  });

  setData(STORAGE.reports, reports);
}

function renderReports() {
  const box = document.getElementById("reportList");
  let reports = getData(STORAGE.reports);

  if (reports.length === 0) {
    box.innerHTML = `<p class="muted">No reports yet.</p>`;
    return;
  }

  reports = reports.sort((a, b) => b.id - a.id);

  box.innerHTML = reports.map(r => `
    <div class="report-card">
      <b>${r.type}</b>
      <p>${r.text}</p>
      <small>${r.time}</small>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  initData();

  const session = JSON.parse(localStorage.getItem(STORAGE.session));

  if (session) {
    currentUser = session;
    loadApp();
  } else {
    document.getElementById("authPage").classList.remove("hidden");
    document.getElementById("appPage").classList.add("hidden");
  }

  renderCart();
});
function openSection(sectionName) {
  showPage("stock");

  setTimeout(() => {
    const searchInput = document.getElementById("stockSearch");

    if (searchInput) {
      searchInput.value = sectionName;
      renderStock();
    }

    toast(sectionName + " section opened");
  }, 100);
}
function clearStockFilter() {
  const searchInput = document.getElementById("stockSearch");

  if (searchInput) {
    searchInput.value = "";
  }

  renderStock();
  toast("All stock shown");
}
